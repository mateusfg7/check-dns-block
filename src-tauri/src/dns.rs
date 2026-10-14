//! Parsing, resolution and classification of domains/IPs against a DNS server.
//!
//! This module ports the behaviour of the original `Verifica-Bloqueio-DNS.cmd`
//! PowerShell tool: `parse_entries` mirrors `Ler-Entradas`, `classify` mirrors
//! `Classificar`, and `answer_text` mirrors `Texto-Resposta`.

use std::collections::HashSet;
use std::net::IpAddr;
use std::sync::LazyLock;
use std::time::Duration;

use hickory_resolver::config::{NameServerConfig, ResolveHosts, ResolverConfig};
use hickory_resolver::net::runtime::TokioRuntimeProvider;
use hickory_resolver::net::{DnsError, NetError};
use hickory_resolver::proto::op::ResponseCode;
use hickory_resolver::proto::rr::{RData, RecordType};
use hickory_resolver::{Resolver, TokioResolver};
use regex::Regex;
use serde::{Deserialize, Serialize};

/// Kind of a parsed entry: a domain name or a literal IP address.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EntryKind {
    Domain,
    Ip,
}

/// A single domain or IP parsed from the user's pasted text.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Entry {
    pub name: String,
    pub kind: EntryKind,
}

/// Result of parsing pasted text into entries.
#[derive(Debug, Clone, Default)]
pub struct ParsedInput {
    pub entries: Vec<Entry>,
    /// Count of tokens that were neither a valid domain nor a valid IP.
    pub ignored: usize,
}

static SPLIT_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"[\s,;|"'<>()\[\]]+"#).expect("valid regex"));
static SCHEME_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[a-z][a-z0-9+.\-]*://").expect("valid regex"));
static USERINFO_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[^/@]*@").expect("valid regex"));
static PATH_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"[/?#].*$").expect("valid regex"));
static WILDCARD_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\*\.").expect("valid regex"));
static PORT_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[^:]+:\d+$").expect("valid regex"));
static IPV4_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\d{1,3}(\.\d{1,3}){3}$").expect("valid regex"));
static DOMAIN_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^([a-z0-9_]([a-z0-9_\-]{0,61}[a-z0-9_])?\.)+[a-z][a-z0-9\-]{1,62}$")
        .expect("valid regex")
});

/// Parses pasted text into deduped domain/IP entries, counting tokens that
/// are neither. Mirrors `Ler-Entradas` from the original `.cmd` tool: accepts
/// URLs, e-mails, host:port, wildcards, IPv4/IPv6, one per line or separated
/// by whitespace/commas/semicolons/etc.
pub fn parse_entries(text: &str) -> ParsedInput {
    let mut seen = HashSet::new();
    let mut entries = Vec::new();
    let mut ignored = 0usize;

    for raw in SPLIT_RE.split(text) {
        let mut t = raw.trim().to_lowercase();
        if t.is_empty() {
            continue;
        }
        t = SCHEME_RE.replace(&t, "").into_owned();
        t = USERINFO_RE.replace(&t, "").into_owned();
        t = PATH_RE.replace(&t, "").into_owned();
        t = WILDCARD_RE.replace(&t, "").into_owned();
        t = t.trim_matches('.').to_string();
        if let Some(idx) = t.rfind(':')
            && PORT_RE.is_match(&t)
        {
            t.truncate(idx);
        }
        if t.is_empty() {
            continue;
        }

        let kind = if IPV4_RE.is_match(&t) || t.contains(':') {
            t.parse::<IpAddr>().ok().map(|ip| {
                t = ip.to_string();
                EntryKind::Ip
            })
        } else {
            if !t.is_ascii()
                && let Ok(ascii) = idna::domain_to_ascii(&t)
            {
                t = ascii;
            }
            ((4..=253).contains(&t.len()) && DOMAIN_RE.is_match(&t)).then_some(EntryKind::Domain)
        };

        match kind {
            Some(kind) => {
                if seen.insert(t.clone()) {
                    entries.push(Entry { name: t, kind });
                }
            }
            None => ignored += 1,
        }
    }

    ParsedInput { entries, ignored }
}

/// Outcome of a single DNS query against one server.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Answer {
    /// Resolved successfully; the joined, human-readable values (IPs or PTR names).
    Ok(Vec<String>),
    NxDomain,
    ServFail,
    Refused,
    /// A successful response with no matching records (e.g. no A record, no PTR).
    Empty,
    Timeout,
    Error(String),
}

/// Classification of a checked entry, mirroring `Classificar` in the original
/// `.cmd` tool's four/seven-way outcome.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Verdict {
    /// Target DNS does not resolve the domain, but the reference DNS does.
    Blocked,
    /// The domain resolves normally on the target DNS.
    NotBlocked,
    /// Neither server answered in a way that lets us tell (no reference, or
    /// the reference also timed out/errored).
    Unresolved,
    /// The target DNS did not respond in time.
    NoResponse,
    /// The domain does not resolve on either server.
    NotFound,
    /// A pasted IP has a reverse (PTR) record on the target DNS.
    ReverseOk,
    /// A pasted IP has no reverse (PTR) record on the target DNS.
    NoReverse,
}

/// Addresses some DNS sinkholes answer with instead of `NXDOMAIN`.
fn is_sinkhole(ip: &str) -> bool {
    ip == "0.0.0.0" || ip.starts_with("127.")
}

/// Classifies a checked entry from the target server's answer and, for
/// domains, the reference server's answer. Mirrors `Classificar`.
pub fn classify(kind: EntryKind, target: &Answer, reference: Option<&Answer>) -> Verdict {
    if *target == Answer::Timeout {
        return Verdict::NoResponse;
    }

    if kind == EntryKind::Ip {
        return if matches!(target, Answer::Ok(_)) {
            Verdict::ReverseOk
        } else {
            Verdict::NoReverse
        };
    }

    if let Answer::Ok(values) = target {
        return if values.iter().any(|v| !is_sinkhole(v)) {
            Verdict::NotBlocked
        } else {
            Verdict::Blocked
        };
    }

    match reference {
        None => Verdict::Unresolved,
        Some(Answer::Timeout) | Some(Answer::Error(_)) => Verdict::Unresolved,
        Some(Answer::Ok(_)) => Verdict::Blocked,
        Some(_) => Verdict::NotFound,
    }
}

/// Renders an answer as the short Portuguese text shown in the UI/reports.
/// Mirrors `Texto-Resposta`.
pub fn answer_text(answer: &Answer, kind: EntryKind) -> String {
    match answer {
        Answer::Ok(values) => values.join(", "),
        Answer::NxDomain => "não resolve (NXDOMAIN)".to_string(),
        Answer::ServFail => "falha (SERVFAIL)".to_string(),
        Answer::Refused => "recusado (REFUSED)".to_string(),
        Answer::Timeout => "sem resposta".to_string(),
        Answer::Empty => {
            if kind == EntryKind::Ip {
                "sem reverso".to_string()
            } else {
                "sem registro A".to_string()
            }
        }
        Answer::Error(msg) => format!("erro: {msg}"),
    }
}

/// Result row for a single checked entry, sent to the frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckRow {
    /// Position in the original (deduped) input, so the UI can keep order
    /// even though queries complete out of order.
    pub index: usize,
    pub entry: String,
    pub kind: EntryKind,
    pub verdict: Verdict,
    pub target_answer: String,
    pub reference_answer: Option<String>,
    /// Local timestamp formatted as `dd/MM/yyyy HH:mm:ss`.
    pub checked_at: String,
}

/// Builds a resolver that only talks to `server`, with no caching and no
/// `/etc/hosts` lookups, so every query reflects what that server actually
/// answers right now.
pub fn build_resolver(server: IpAddr) -> Result<TokioResolver, String> {
    let name_server = NameServerConfig::udp_and_tcp(server);
    let config = ResolverConfig::from_name_servers(vec![name_server]);
    let mut builder = Resolver::builder_with_config(config, TokioRuntimeProvider::default());
    {
        let opts = builder.options_mut();
        opts.timeout = Duration::from_secs(3);
        opts.attempts = 2;
        opts.cache_size = 0;
        opts.use_hosts_file = ResolveHosts::Never;
    }
    builder.build().map_err(|err| err.to_string())
}

/// Queries `resolver` for `entry`: an `A` lookup for domains, a `PTR`
/// (reverse) lookup for IPs.
pub async fn query(resolver: &TokioResolver, entry: &Entry) -> Answer {
    let result = match entry.kind {
        EntryKind::Domain => resolver.lookup(entry.name.as_str(), RecordType::A).await,
        EntryKind::Ip => {
            let ip: IpAddr = entry
                .name
                .parse()
                .expect("entry.name was validated as an IP address during parsing");
            resolver.reverse_lookup(ip).await
        }
    };

    match result {
        Ok(lookup) => {
            let values: Vec<String> = lookup
                .answers()
                .iter()
                .filter_map(|record| match &record.data {
                    RData::A(a) => Some(a.0.to_string()),
                    RData::PTR(ptr) => Some(ptr.0.to_string().trim_end_matches('.').to_string()),
                    _ => None,
                })
                .collect();
            if values.is_empty() {
                Answer::Empty
            } else {
                Answer::Ok(values)
            }
        }
        Err(err) => classify_error(&err),
    }
}

fn classify_error(err: &NetError) -> Answer {
    match err {
        NetError::Timeout => Answer::Timeout,
        NetError::Dns(DnsError::NoRecordsFound(no_records)) => match no_records.response_code {
            ResponseCode::NXDomain => Answer::NxDomain,
            _ => Answer::Empty,
        },
        NetError::Dns(DnsError::ResponseCode(ResponseCode::ServFail)) => Answer::ServFail,
        NetError::Dns(DnsError::ResponseCode(ResponseCode::Refused)) => Answer::Refused,
        other => Answer::Error(other.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verdict_serializes_as_snake_case() {
        assert_eq!(
            serde_json::to_string(&Verdict::Blocked).unwrap(),
            "\"blocked\""
        );
        assert_eq!(
            serde_json::to_string(&Verdict::NotBlocked).unwrap(),
            "\"not_blocked\""
        );
        assert_eq!(
            serde_json::to_string(&Verdict::Unresolved).unwrap(),
            "\"unresolved\""
        );
        assert_eq!(
            serde_json::to_string(&Verdict::NoResponse).unwrap(),
            "\"no_response\""
        );
        assert_eq!(
            serde_json::to_string(&Verdict::NotFound).unwrap(),
            "\"not_found\""
        );
        assert_eq!(
            serde_json::to_string(&Verdict::ReverseOk).unwrap(),
            "\"reverse_ok\""
        );
        assert_eq!(
            serde_json::to_string(&Verdict::NoReverse).unwrap(),
            "\"no_reverse\""
        );
    }

    fn domain(name: &str) -> Entry {
        Entry {
            name: name.to_string(),
            kind: EntryKind::Domain,
        }
    }

    #[test]
    fn parses_url_userinfo_path_wildcard_and_port() {
        let input = "HTTPS://user:pass@Exemplo.COM.BR:8080/caminho?x=1\n\
                     *.outro-dominio.com.br\n\
                     exemplo.com.br\n\
                     contato@dominio-exemplo.com";
        let parsed = parse_entries(input);
        assert_eq!(parsed.ignored, 0);
        assert_eq!(
            parsed.entries,
            vec![
                domain("exemplo.com.br"),
                domain("outro-dominio.com.br"),
                domain("dominio-exemplo.com"),
            ]
        );
    }

    #[test]
    fn dedupes_and_canonicalizes_ips_while_counting_ignored_tokens() {
        let input = "8.8.8.8, 2001:db8::1; 1.2.3.4:53 | 8.8.8.8 | lixo!! notadomain";
        let parsed = parse_entries(input);
        assert_eq!(parsed.ignored, 2); // "lixo!!" and "notadomain"
        assert_eq!(
            parsed.entries,
            vec![
                Entry {
                    name: "8.8.8.8".to_string(),
                    kind: EntryKind::Ip
                },
                Entry {
                    name: "2001:db8::1".to_string(),
                    kind: EntryKind::Ip
                },
                Entry {
                    name: "1.2.3.4".to_string(),
                    kind: EntryKind::Ip
                },
            ]
        );
    }

    #[test]
    fn converts_idn_domains_to_punycode() {
        let parsed = parse_entries("café.com");
        assert_eq!(parsed.ignored, 0);
        assert_eq!(parsed.entries.len(), 1);
        let entry = &parsed.entries[0];
        assert_eq!(entry.kind, EntryKind::Domain);
        assert!(entry.name.is_ascii());
        assert!(entry.name.starts_with("xn--"));
        assert!(entry.name.ends_with(".com"));
    }

    #[test]
    fn classify_no_response_takes_priority() {
        let v = classify(
            EntryKind::Domain,
            &Answer::Timeout,
            Some(&Answer::Ok(vec!["1.2.3.4".into()])),
        );
        assert_eq!(v, Verdict::NoResponse);
    }

    #[test]
    fn classify_ip_reverse_lookup() {
        assert_eq!(
            classify(
                EntryKind::Ip,
                &Answer::Ok(vec!["host.example.com".into()]),
                None
            ),
            Verdict::ReverseOk
        );
        assert_eq!(
            classify(EntryKind::Ip, &Answer::Empty, None),
            Verdict::NoReverse
        );
    }

    #[test]
    fn classify_domain_blocked_via_sinkhole_answers() {
        assert_eq!(
            classify(
                EntryKind::Domain,
                &Answer::Ok(vec!["0.0.0.0".into()]),
                Some(&Answer::Ok(vec!["93.184.216.34".into()]))
            ),
            Verdict::Blocked
        );
        assert_eq!(
            classify(
                EntryKind::Domain,
                &Answer::Ok(vec!["127.0.0.1".into(), "127.0.0.2".into()]),
                None
            ),
            Verdict::Blocked
        );
    }

    #[test]
    fn classify_domain_not_blocked_when_any_real_answer() {
        assert_eq!(
            classify(
                EntryKind::Domain,
                &Answer::Ok(vec!["0.0.0.0".into(), "93.184.216.34".into()]),
                None
            ),
            Verdict::NotBlocked
        );
    }

    #[test]
    fn classify_domain_blocked_vs_not_found_vs_unresolved() {
        // Target fails to resolve, reference resolves -> BLOQUEADO.
        assert_eq!(
            classify(
                EntryKind::Domain,
                &Answer::NxDomain,
                Some(&Answer::Ok(vec!["93.184.216.34".into()]))
            ),
            Verdict::Blocked
        );
        // Neither resolves -> NÃO EXISTE.
        assert_eq!(
            classify(
                EntryKind::Domain,
                &Answer::NxDomain,
                Some(&Answer::NxDomain)
            ),
            Verdict::NotFound
        );
        // No reference configured -> NÃO RESOLVE.
        assert_eq!(
            classify(EntryKind::Domain, &Answer::NxDomain, None),
            Verdict::Unresolved
        );
        // Reference also errored/timed out -> NÃO RESOLVE.
        assert_eq!(
            classify(EntryKind::Domain, &Answer::ServFail, Some(&Answer::Timeout)),
            Verdict::Unresolved
        );
    }

    #[test]
    fn answer_text_matches_expected_strings() {
        assert_eq!(
            answer_text(
                &Answer::Ok(vec!["1.1.1.1".into(), "2.2.2.2".into()]),
                EntryKind::Domain
            ),
            "1.1.1.1, 2.2.2.2"
        );
        assert_eq!(
            answer_text(&Answer::NxDomain, EntryKind::Domain),
            "não resolve (NXDOMAIN)"
        );
        assert_eq!(
            answer_text(&Answer::ServFail, EntryKind::Domain),
            "falha (SERVFAIL)"
        );
        assert_eq!(
            answer_text(&Answer::Refused, EntryKind::Domain),
            "recusado (REFUSED)"
        );
        assert_eq!(
            answer_text(&Answer::Timeout, EntryKind::Domain),
            "sem resposta"
        );
        assert_eq!(
            answer_text(&Answer::Empty, EntryKind::Domain),
            "sem registro A"
        );
        assert_eq!(answer_text(&Answer::Empty, EntryKind::Ip), "sem reverso");
        assert_eq!(
            answer_text(&Answer::Error("boom".into()), EntryKind::Domain),
            "erro: boom"
        );
    }

    #[tokio::test]
    #[ignore = "performs a real network query against 8.8.8.8"]
    async fn resolves_google_via_public_dns() {
        let resolver = build_resolver("8.8.8.8".parse().unwrap()).unwrap();
        let entry = domain("google.com");
        let answer = query(&resolver, &entry).await;
        assert!(
            matches!(answer, Answer::Ok(_)),
            "expected Ok, got {answer:?}"
        );
    }
}
