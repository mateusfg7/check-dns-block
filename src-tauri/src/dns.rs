//! DNS blockage classification.
//!
//! This module defines the data contract between the Rust backend and the
//! React frontend for a single DNS lookup result. The actual resolution
//! logic (querying the ISP DNS server and a public DNS server, then
//! comparing the answers) is not implemented yet — this is scaffolding only.

use serde::{Deserialize, Serialize};

/// Outcome of comparing a domain/IP lookup against the ISP DNS and a public
/// DNS server, mirroring the four outcomes described in the original
/// `Verifica-Bloqueio-DNS.cmd` tool.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Verdict {
    /// The ISP DNS does not resolve the domain, but the public DNS does.
    Blocked,
    /// The domain resolves normally on the ISP DNS.
    NotBlocked,
    /// The domain does not resolve on either DNS server.
    NotFound,
    /// A pasted IP has a reverse (PTR) record.
    ReverseOk,
}

/// Placeholder classifier.
///
/// TODO: replace with real resolution against the ISP DNS server and a
/// public DNS server (e.g. via `hickory-resolver`), then compare the
/// answers to produce a [`Verdict`].
#[allow(dead_code)]
pub fn classify(isp_resolved: Option<()>, public_resolved: Option<()>) -> Verdict {
    match (isp_resolved, public_resolved) {
        (None, Some(())) => Verdict::Blocked,
        (Some(()), _) => Verdict::NotBlocked,
        (None, None) => Verdict::NotFound,
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
            serde_json::to_string(&Verdict::NotFound).unwrap(),
            "\"not_found\""
        );
        assert_eq!(
            serde_json::to_string(&Verdict::ReverseOk).unwrap(),
            "\"reverse_ok\""
        );
    }

    #[test]
    fn classify_matches_blocked_rule() {
        assert_eq!(classify(None, Some(())), Verdict::Blocked);
        assert_eq!(classify(Some(()), Some(())), Verdict::NotBlocked);
        assert_eq!(classify(None, None), Verdict::NotFound);
    }
}
