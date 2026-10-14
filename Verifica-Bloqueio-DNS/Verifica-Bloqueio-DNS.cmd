<# :
@echo off
rem ---------------------------------------------------------------------------
rem  Verifica-Bloqueio-DNS
rem  Duplo clique: abre a janela, cole os dominios/IPs e clique em Verificar.
rem  Linha de comando: Verifica-Bloqueio-DNS.cmd lista.txt [servidor-dns]
rem ---------------------------------------------------------------------------
setlocal
set "VBD_SELF=%~f0"
set "VBD_ARQ=%~1"
set "VBD_DNS=%~2"
set "VBD_JANELA=Hidden"
if not "%~1"=="" set "VBD_JANELA=Normal"
powershell -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle %VBD_JANELA% -Command "Invoke-Expression ([IO.File]::ReadAllText($env:VBD_SELF, [Text.Encoding]::UTF8))"
if not "%~1"=="" pause
exit /b
#>

$ErrorActionPreference = 'Stop'

$DNS_PADRAO = '177.137.208.6'   # DNS recursivo onde os bloqueios são aplicados
$REF_PADRAO = '8.8.8.8'         # DNS público usado só para comparar
$CONTROLE   = 'google.com'      # nome que precisa resolver para o servidor ser considerado no ar
$PARALELO   = 16

# Quebra o texto colado em domínios e IPs. Aceita URL, e-mail, porta, vírgula, ponto e vírgula etc.
function Ler-Entradas([string]$texto) {
    $vistos = @{}
    $itens = New-Object System.Collections.Generic.List[object]
    $ignorados = 0
    foreach ($bruto in ($texto -split '[\s,;|"''<>()\[\]]+')) {
        $t = $bruto.Trim().ToLower()
        if (-not $t) { continue }
        $t = $t -replace '^[a-z][a-z0-9+.\-]*://', ''
        $t = $t -replace '^[^/@]*@', ''
        $t = $t -replace '[/?#].*$', ''
        $t = $t -replace '^\*\.', ''
        $t = $t.Trim('.')
        if ($t -match '^[^:]+:\d+$') { $t = $t -replace ':\d+$', '' }
        if (-not $t) { continue }

        $tipo = $null
        if ($t -match '^\d{1,3}(\.\d{1,3}){3}$' -or $t.Contains(':')) {
            $ip = $null
            if ([System.Net.IPAddress]::TryParse($t, [ref]$ip)) { $tipo = 'IP'; $t = $ip.ToString() }
        } else {
            if ($t -match '[^\x00-\x7f]') {
                try { $t = (New-Object System.Globalization.IdnMapping).GetAscii($t) } catch { }
            }
            if ($t -match '^(?=.{4,253}$)([a-z0-9_]([a-z0-9_\-]{0,61}[a-z0-9_])?\.)+[a-z][a-z0-9\-]{1,62}$') { $tipo = 'Domínio' }
        }

        if (-not $tipo) { $ignorados++; continue }
        if ($vistos.ContainsKey($t)) { continue }
        $vistos[$t] = $true
        $itens.Add([pscustomobject]@{ Nome = $t; Tipo = $tipo })
    }
    return @{ itens = $itens; ignorados = $ignorados }
}

# Roda dentro de cada runspace: pergunta ao servidor testado e, se pedido, ao de referência.
$CONSULTA = {
    param([string]$nome, [string]$registro, [string]$servidor, [string]$referencia)

    function Perguntar([string]$n, [string]$srv, [string]$t) {
        try {
            $r = @(Resolve-DnsName -Name $n -Server $srv -Type $t -DnsOnly -ErrorAction Stop)
            # IP4Address e não IPAddress: o alias vem do módulo e às vezes chega vazio com runspaces em paralelo
            if ($t -eq 'PTR') { $v = @($r | Where-Object { $_.Type -eq 'PTR' } | ForEach-Object { "$($_.NameHost)" } | Where-Object { $_ }) }
            else { $v = @($r | Where-Object { $_.Type -eq 'A' } | ForEach-Object { "$($_.IP4Address)" } | Where-Object { $_ }) }
            if ($v.Count -gt 0) { return @{ cod = 'OK'; val = ($v -join ', ') } }
            return @{ cod = 'VAZIO'; val = '' }
        } catch {
            $ex = $_.Exception
            $c = 0
            if ($ex -is [System.ComponentModel.Win32Exception]) { $c = $ex.NativeErrorCode }
            switch ($c) {
                9003 { return @{ cod = 'NXDOMAIN'; val = '' } }
                9002 { return @{ cod = 'SERVFAIL'; val = '' } }
                9005 { return @{ cod = 'REFUSED'; val = '' } }
                9501 { return @{ cod = 'VAZIO'; val = '' } }
                1460 { return @{ cod = 'TIMEOUT'; val = '' } }
                default { return @{ cod = 'ERRO'; val = $ex.Message } }
            }
        }
    }

    $saida = @{ quando = (Get-Date); t = (Perguntar $nome $servidor $registro); r = $null }
    if ($referencia) { $saida.r = Perguntar $nome $referencia $registro }
    return $saida
}

function Texto-Resposta($x, [string]$tipo) {
    if (-not $x) { return '' }
    switch ($x.cod) {
        'OK'       { return $x.val }
        'NXDOMAIN' { return 'não resolve (NXDOMAIN)' }
        'SERVFAIL' { return 'falha (SERVFAIL)' }
        'REFUSED'  { return 'recusado (REFUSED)' }
        'TIMEOUT'  { return 'sem resposta' }
        'VAZIO'    { if ($tipo -eq 'IP') { return 'sem reverso' } else { return 'sem registro A' } }
        default    { return "erro: $($x.val)" }
    }
}

function Classificar($item, $t, $r, $quando) {
    if ($t.cod -eq 'TIMEOUT') { $sit = 'SEM RESPOSTA' }
    elseif ($item.Tipo -eq 'IP') {
        if ($t.cod -eq 'OK') { $sit = 'REVERSO OK' } else { $sit = 'SEM REVERSO' }
    }
    elseif ($t.cod -eq 'OK') {
        # 0.0.0.0 e 127.x são respostas de bloqueio em alguns recursivos
        $reais = @($t.val -split ', ' | Where-Object { $_ -notmatch '^(0\.0\.0\.0$|127\.)' })
        if ($reais.Count -eq 0) { $sit = 'BLOQUEADO' } else { $sit = 'NÃO BLOQUEADO' }
    }
    elseif (-not $r -or $r.cod -eq 'TIMEOUT' -or $r.cod -eq 'ERRO') { $sit = 'NÃO RESOLVE' }
    elseif ($r.cod -eq 'OK') { $sit = 'BLOQUEADO' }
    else { $sit = 'NÃO EXISTE' }

    [pscustomobject]@{
        Entrada    = $item.Nome
        Tipo       = $item.Tipo
        Situacao   = $sit
        Servidor   = Texto-Resposta $t $item.Tipo
        Referencia = Texto-Resposta $r $item.Tipo
        Quando     = $quando.ToString('dd/MM/yyyy HH:mm:ss')
    }
}

function Iniciar-Consultas($itens, [string]$servidor, [string]$referencia) {
    $pool = [runspacefactory]::CreateRunspacePool(1, $PARALELO)
    $pool.Open()
    $jobs = @(foreach ($i in $itens) {
        $registro = 'A'
        if ($i.Tipo -eq 'IP') { $registro = 'PTR' }
        $ps = [powershell]::Create()
        $ps.RunspacePool = $pool
        [void]$ps.AddScript($CONSULTA.ToString()).AddArgument($i.Nome).AddArgument($registro).AddArgument($servidor).AddArgument($referencia)
        @{ item = $i; ps = $ps; h = $ps.BeginInvoke() }
    })
    return @{ pool = $pool; jobs = $jobs }
}

function Coletar($job) {
    try {
        $res = $job.ps.EndInvoke($job.h)[0]
        $linha = Classificar $job.item $res.t $res.r $res.quando
    } catch {
        $linha = Classificar $job.item @{ cod = 'ERRO'; val = $_.Exception.Message } $null (Get-Date)
    }
    $job.ps.Dispose()
    return $linha
}

function Resumo($resultados) {
    $partes = $resultados | Group-Object Situacao | Sort-Object Count -Descending | ForEach-Object { "$($_.Count) $($_.Name)" }
    return "$(($resultados | Measure-Object).Count) verificados: " + ($partes -join ' | ')
}

function Para-Csv($resultados, [string]$servidor, [string]$referencia) {
    $colRef = 'Referência'
    if ($referencia) { $colRef = "Resposta $referencia" }
    $resultados | Select-Object Entrada, Tipo, @{ n = 'Situação'; e = { $_.Situacao } },
        @{ n = "Resposta $servidor"; e = { $_.Servidor } }, @{ n = $colRef; e = { $_.Referencia } },
        @{ n = 'Consultado em'; e = { $_.Quando } } |
        ConvertTo-Csv -Delimiter ';' -NoTypeInformation
}

# Relatório em texto para anexar ao ofício: bloqueados primeiro, com data/hora de cada consulta.
function Para-Evidencia($resultados, [string]$servidor, [string]$referencia) {
    $bloq = @($resultados | Where-Object { $_.Situacao -eq 'BLOQUEADO' })
    $resto = @($resultados | Where-Object { $_.Situacao -ne 'BLOQUEADO' })
    $larg = [math]::Max(20, (@($resultados | ForEach-Object { $_.Entrada.Length }) | Measure-Object -Maximum).Maximum) + 2
    $fuso = [TimeZoneInfo]::Local.GetUtcOffset((Get-Date))
    $sinal = '+'
    if ($fuso -lt [TimeSpan]::Zero) { $sinal = '-' }

    $o = New-Object System.Collections.Generic.List[string]
    $o.Add('EVIDÊNCIA DE BLOQUEIO DE DOMÍNIOS NO DNS RECURSIVO')
    $o.Add('=' * 50)
    $o.Add('Gerado em:               ' + (Get-Date -Format 'dd/MM/yyyy HH:mm:ss') + " (UTC$sinal" + $fuso.ToString('hh\:mm') + ')')
    $o.Add("Servidor DNS consultado: $servidor")
    if ($referencia) { $o.Add("DNS público de comparação: $referencia") }
    $o.Add('Resultado:               ' + (Resumo $resultados))
    $o.Add('')
    $o.Add("DOMÍNIOS BLOQUEADOS ($($bloq.Count))")
    $o.Add('-' * 50)
    foreach ($r in $bloq) {
        $l = $r.Quando + '  ' + $r.Entrada.PadRight($larg) + 'BLOQUEADO  ' + "${servidor}: " + $r.Servidor
        if ($referencia) { $l += "  |  ${referencia}: " + $r.Referencia }
        $o.Add($l)
    }
    if ($bloq.Count -eq 0) { $o.Add('(nenhum)') }
    if ($resto.Count -gt 0) {
        $o.Add('')
        $o.Add("DEMAIS ENTRADAS ($($resto.Count))")
        $o.Add('-' * 50)
        foreach ($r in $resto) {
            $l = $r.Quando + '  ' + $r.Entrada.PadRight($larg) + $r.Situacao.PadRight(15) + "${servidor}: " + $r.Servidor
            if ($referencia) { $l += "  |  ${referencia}: " + $r.Referencia }
            $o.Add($l)
        }
    }
    $o.Add('')
    $o.Add('Critério: BLOQUEADO = o servidor consultado não resolve o domínio (ou devolve 0.0.0.0/127.x)')
    if ($referencia) { $o.Add("enquanto o DNS público $referencia resolve normalmente. NÃO EXISTE = não resolve em nenhum dos dois.") }
    $o.Add("Conferência manual: nslookup <domínio> $servidor")
    return $o
}

function Eh-IP([string]$s) {
    $ip = $null
    return [System.Net.IPAddress]::TryParse($s, [ref]$ip)
}

# ----------------------------- modo linha de comando -----------------------------
if ($env:VBD_ARQ) {
    $servidor = $DNS_PADRAO
    if ($env:VBD_DNS) { $servidor = $env:VBD_DNS }
    if (-not (Test-Path -LiteralPath $env:VBD_ARQ)) { Write-Host "Arquivo não encontrado: $env:VBD_ARQ" -ForegroundColor Red; exit 1 }
    if (-not (Eh-IP $servidor)) { Write-Host "Servidor DNS inválido: $servidor" -ForegroundColor Red; exit 1 }

    $lido = Ler-Entradas ([IO.File]::ReadAllText($env:VBD_ARQ))
    if ($lido.itens.Count -eq 0) { Write-Host 'Nenhum domínio ou IP encontrado no arquivo.' -ForegroundColor Red; exit 1 }
    if ((& $CONSULTA $CONTROLE 'A' $servidor '').t.cod -ne 'OK') {
        Write-Host "O servidor $servidor não respondeu a consulta de teste ($CONTROLE). Rode de dentro da rede atendida por ele." -ForegroundColor Red
        exit 1
    }

    Write-Host "Consultando $($lido.itens.Count) entradas em $servidor (comparando com $REF_PADRAO)..."
    $exec = Iniciar-Consultas $lido.itens $servidor $REF_PADRAO
    $resultados = @(foreach ($j in $exec.jobs) { Coletar $j })
    $exec.pool.Dispose()

    $resultados | Format-Table Entrada, Tipo, Situacao, Servidor, Referencia -AutoSize | Out-String -Width 250 | Write-Host
    Write-Host (Resumo $resultados)
    $csv = [IO.Path]::ChangeExtension((Resolve-Path -LiteralPath $env:VBD_ARQ).Path, $null) + 'resultado.csv'
    Para-Csv $resultados $servidor $REF_PADRAO | Out-File -LiteralPath $csv -Encoding UTF8
    Write-Host "Resultado salvo em $csv"
    $txt = [IO.Path]::ChangeExtension($csv, 'txt') -replace 'resultado\.txt$', 'evidencia.txt'
    Para-Evidencia $resultados $servidor $REF_PADRAO | Out-File -LiteralPath $txt -Encoding UTF8
    Write-Host "Evidência salva em $txt"
    exit 0
}

# --------------------------------- modo janela ---------------------------------
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$CORES = @{
    'BLOQUEADO'     = [System.Drawing.Color]::FromArgb(255, 221, 221)
    'NÃO BLOQUEADO' = [System.Drawing.Color]::FromArgb(221, 244, 221)
    'REVERSO OK'    = [System.Drawing.Color]::FromArgb(221, 244, 221)
    'NÃO RESOLVE'   = [System.Drawing.Color]::FromArgb(255, 243, 205)
    'SEM RESPOSTA'  = [System.Drawing.Color]::FromArgb(255, 243, 205)
    'NÃO EXISTE'    = [System.Drawing.Color]::FromArgb(236, 236, 236)
    'SEM REVERSO'   = [System.Drawing.Color]::FromArgb(236, 236, 236)
}

$estado = @{ jobs = @(); pool = $null; proximo = 0; resultados = (New-Object System.Collections.Generic.List[object]); servidor = ''; referencia = ''; ignorados = 0 }

function Avisar([string]$msg, [string]$icone = 'Warning') {
    [void][System.Windows.Forms.MessageBox]::Show($form, $msg, 'Verifica Bloqueio DNS', 'OK', $icone)
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'Verifica Bloqueio DNS'
$form.ClientSize = New-Object System.Drawing.Size(1040, 680)
$form.MinimumSize = New-Object System.Drawing.Size(760, 520)
$form.StartPosition = 'CenterScreen'
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9)

$topo = New-Object System.Windows.Forms.FlowLayoutPanel
$topo.Location = New-Object System.Drawing.Point(12, 8)
$topo.Size = New-Object System.Drawing.Size(1016, 32)
$topo.Anchor = 'Top, Left, Right'
$topo.WrapContents = $false

$lblSrv = New-Object System.Windows.Forms.Label
$lblSrv.Text = 'Servidor DNS a consultar:'
$lblSrv.AutoSize = $true
$lblSrv.Margin = New-Object System.Windows.Forms.Padding(0, 7, 4, 0)

$txtSrv = New-Object System.Windows.Forms.TextBox
$txtSrv.Text = $DNS_PADRAO
$txtSrv.Width = 120
$txtSrv.Margin = New-Object System.Windows.Forms.Padding(0, 4, 24, 0)

$chkRef = New-Object System.Windows.Forms.CheckBox
$chkRef.Text = 'Comparar com DNS público:'
$chkRef.Checked = $true
$chkRef.AutoSize = $true
$chkRef.Margin = New-Object System.Windows.Forms.Padding(0, 6, 4, 0)

$txtRef = New-Object System.Windows.Forms.TextBox
$txtRef.Text = $REF_PADRAO
$txtRef.Width = 120
$txtRef.Margin = New-Object System.Windows.Forms.Padding(0, 4, 0, 0)

$topo.Controls.AddRange(@($lblSrv, $txtSrv, $chkRef, $txtRef))

$lblCole = New-Object System.Windows.Forms.Label
$lblCole.Text = 'Cole abaixo os domínios e/ou IPs (um por linha, ou separados por espaço, vírgula ou ponto e vírgula):'
$lblCole.AutoSize = $true
$lblCole.Location = New-Object System.Drawing.Point(12, 46)

$txtEntrada = New-Object System.Windows.Forms.TextBox
$txtEntrada.Multiline = $true
$txtEntrada.ScrollBars = 'Vertical'
$txtEntrada.AcceptsReturn = $true
$txtEntrada.WordWrap = $false
$txtEntrada.MaxLength = 0
$txtEntrada.Font = New-Object System.Drawing.Font('Consolas', 10)
$txtEntrada.Location = New-Object System.Drawing.Point(12, 66)
$txtEntrada.Size = New-Object System.Drawing.Size(1016, 150)
$txtEntrada.Anchor = 'Top, Left, Right'

$botoes = New-Object System.Windows.Forms.FlowLayoutPanel
$botoes.Location = New-Object System.Drawing.Point(12, 222)
$botoes.Size = New-Object System.Drawing.Size(1016, 36)
$botoes.Anchor = 'Top, Left, Right'
$botoes.WrapContents = $false

function Novo-Botao([string]$texto, [int]$largura) {
    $b = New-Object System.Windows.Forms.Button
    $b.Text = $texto
    $b.Size = New-Object System.Drawing.Size($largura, 28)
    $b.Margin = New-Object System.Windows.Forms.Padding(0, 3, 8, 0)
    return $b
}
$btnVerificar = Novo-Botao 'Verificar' 110
$btnLimpar    = Novo-Botao 'Limpar' 80
$btnCopiar    = Novo-Botao 'Copiar resultado' 130
$btnSalvar    = Novo-Botao 'Salvar CSV...' 110
$btnEvidencia = Novo-Botao 'Salvar evidência...' 140
$btnCopiar.Enabled = $false
$btnSalvar.Enabled = $false
$btnEvidencia.Enabled = $false
$chkBloq = New-Object System.Windows.Forms.CheckBox
$chkBloq.Text = 'Mostrar só bloqueados'
$chkBloq.AutoSize = $true
$chkBloq.Margin = New-Object System.Windows.Forms.Padding(8, 8, 0, 0)
$botoes.Controls.AddRange(@($btnVerificar, $btnLimpar, $btnCopiar, $btnSalvar, $btnEvidencia, $chkBloq))

$grid = New-Object System.Windows.Forms.DataGridView
$grid.Location = New-Object System.Drawing.Point(12, 262)
$grid.Size = New-Object System.Drawing.Size(1016, 388)
$grid.Anchor = 'Top, Bottom, Left, Right'
$grid.ReadOnly = $true
$grid.AllowUserToAddRows = $false
$grid.AllowUserToDeleteRows = $false
$grid.AllowUserToResizeRows = $false
$grid.RowHeadersVisible = $false
$grid.SelectionMode = 'FullRowSelect'
$grid.AutoSizeColumnsMode = 'Fill'
$grid.BackgroundColor = [System.Drawing.SystemColors]::Window
$grid.BorderStyle = 'FixedSingle'
[void]$grid.Columns.Add('Entrada', 'Entrada')
[void]$grid.Columns.Add('Tipo', 'Tipo')
[void]$grid.Columns.Add('Situacao', 'Situação')
[void]$grid.Columns.Add('Servidor', "Resposta $DNS_PADRAO")
[void]$grid.Columns.Add('Referencia', "Resposta $REF_PADRAO")
[void]$grid.Columns.Add('Quando', 'Consultado em')
$grid.Columns['Entrada'].FillWeight = 26
$grid.Columns['Tipo'].FillWeight = 8
$grid.Columns['Situacao'].FillWeight = 14
$grid.Columns['Servidor'].FillWeight = 22
$grid.Columns['Referencia'].FillWeight = 22
$grid.Columns['Quando'].FillWeight = 15

$barra = New-Object System.Windows.Forms.StatusStrip
$lblStatus = New-Object System.Windows.Forms.ToolStripStatusLabel
$lblStatus.Text = 'Pronto.'
$lblStatus.Spring = $true
$lblStatus.TextAlign = 'MiddleLeft'
$progresso = New-Object System.Windows.Forms.ToolStripProgressBar
$progresso.Size = New-Object System.Drawing.Size(200, 16)
$progresso.Visible = $false
[void]$barra.Items.Add($lblStatus)
[void]$barra.Items.Add($progresso)

$form.Controls.AddRange(@($topo, $lblCole, $txtEntrada, $botoes, $grid, $barra))

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 150

function Travar([bool]$rodando) {
    $btnVerificar.Enabled = -not $rodando
    $btnLimpar.Enabled = -not $rodando
    $txtSrv.Enabled = -not $rodando
    $chkRef.Enabled = -not $rodando
    $txtRef.Enabled = (-not $rodando) -and $chkRef.Checked
    $progresso.Visible = $rodando
    $temDados = $estado.resultados.Count -gt 0
    $btnCopiar.Enabled = (-not $rodando) -and $temDados
    $btnSalvar.Enabled = (-not $rodando) -and $temDados
    $btnEvidencia.Enabled = (-not $rodando) -and $temDados
}

# O que Copiar e Salvar CSV levam: o mesmo que está na tela
function Visiveis {
    if ($chkBloq.Checked) { return @($estado.resultados | Where-Object { $_.Situacao -eq 'BLOQUEADO' }) }
    return $estado.resultados.ToArray()
}

$chkBloq.Add_CheckedChanged({
    foreach ($linha in $grid.Rows) {
        $linha.Visible = (-not $chkBloq.Checked) -or ($linha.Cells['Situacao'].Value -eq 'BLOQUEADO')
    }
})

# Texto colado de alguns sistemas vem só com LF e o TextBox junta tudo numa linha
$txtEntrada.Add_TextChanged({
    if ($txtEntrada.Text -match '(?<!\r)\n') {
        $txtEntrada.Text = $txtEntrada.Text -replace '\r?\n', "`r`n"
        $txtEntrada.SelectionStart = $txtEntrada.TextLength
    }
})

$chkRef.Add_CheckedChanged({ $txtRef.Enabled = $chkRef.Checked })

# TextBox multilinha do .NET Framework não trata Ctrl+A sozinho
$txtEntrada.Add_KeyDown({
    param($s, $e)
    if ($e.Control -and $e.KeyCode -eq 'A') { $txtEntrada.SelectAll(); $e.SuppressKeyPress = $true }
})

$btnLimpar.Add_Click({
    $txtEntrada.Clear()
    $grid.Rows.Clear()
    $estado.resultados.Clear()
    $lblStatus.Text = 'Pronto.'
    Travar $false
    $txtEntrada.Focus()
})

$btnVerificar.Add_Click({
    try {
        $servidor = $txtSrv.Text.Trim()
        $referencia = ''
        if ($chkRef.Checked) { $referencia = $txtRef.Text.Trim() }
        if (-not (Eh-IP $servidor)) { Avisar 'Informe o IP do servidor DNS a consultar.'; return }
        if ($referencia -and -not (Eh-IP $referencia)) { Avisar 'Informe o IP do DNS público de comparação ou desmarque a opção.'; return }

        $lido = Ler-Entradas $txtEntrada.Text
        if ($lido.itens.Count -eq 0) { Avisar 'Cole pelo menos um domínio ou IP válido.'; return }

        $form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
        $lblStatus.Text = "Testando o servidor $servidor..."
        $form.Refresh()
        $okSrv = (& $CONSULTA $CONTROLE 'A' $servidor '').t.cod -eq 'OK'
        $okRef = $true
        if ($okSrv -and $referencia) { $okRef = (& $CONSULTA $CONTROLE 'A' $referencia '').t.cod -eq 'OK' }
        $form.Cursor = [System.Windows.Forms.Cursors]::Default

        if (-not $okSrv) {
            $lblStatus.Text = 'Pronto.'
            Avisar "O servidor $servidor não respondeu a consulta de teste ($CONTROLE).`r`n`r`nEste computador precisa estar na rede atendida por esse DNS."
            return
        }
        if (-not $okRef) {
            Avisar "O DNS público $referencia não respondeu daqui. A verificação segue sem comparação: o que não resolver aparece como NÃO RESOLVE."
            $referencia = ''
        }

        $grid.Rows.Clear()
        $estado.resultados.Clear()
        $grid.Columns['Servidor'].HeaderText = "Resposta $servidor"
        $grid.Columns['Referencia'].HeaderText = 'Referência'
        if ($referencia) { $grid.Columns['Referencia'].HeaderText = "Resposta $referencia" }
        $grid.Columns['Referencia'].Visible = [bool]$referencia

        $exec = Iniciar-Consultas $lido.itens $servidor $referencia
        $estado.pool = $exec.pool
        $estado.jobs = $exec.jobs
        $estado.proximo = 0
        $estado.servidor = $servidor
        $estado.referencia = $referencia
        $estado.ignorados = $lido.ignorados
        $progresso.Maximum = $estado.jobs.Count
        $progresso.Value = 0
        Travar $true
        $timer.Start()
    } catch {
        $form.Cursor = [System.Windows.Forms.Cursors]::Default
        Avisar "Falha ao iniciar a verificação: $($_.Exception.Message)" 'Error'
    }
})

$timer.Add_Tick({
    try {
        $lote = 0
        while ($estado.proximo -lt $estado.jobs.Count -and $estado.jobs[$estado.proximo].h.IsCompleted -and $lote -lt 200) {
            $l = Coletar $estado.jobs[$estado.proximo]
            $estado.resultados.Add($l)
            $idx = $grid.Rows.Add($l.Entrada, $l.Tipo, $l.Situacao, $l.Servidor, $l.Referencia, $l.Quando)
            if ($CORES.ContainsKey($l.Situacao)) { $grid.Rows[$idx].DefaultCellStyle.BackColor = $CORES[$l.Situacao] }
            if ($chkBloq.Checked -and $l.Situacao -ne 'BLOQUEADO') { $grid.Rows[$idx].Visible = $false }
            $estado.proximo++
            $lote++
        }
        $progresso.Value = $estado.proximo
        $lblStatus.Text = "Consultando... $($estado.proximo) de $($estado.jobs.Count)"

        if ($estado.proximo -ge $estado.jobs.Count) {
            $timer.Stop()
            $estado.pool.Dispose()
            $estado.pool = $null
            $texto = Resumo $estado.resultados.ToArray()
            if ($estado.ignorados -gt 0) { $texto += "   ($($estado.ignorados) trechos ignorados por não serem domínio nem IP)" }
            $lblStatus.Text = $texto
            $grid.ClearSelection()
            Travar $false
        }
    } catch {
        $timer.Stop()
        Travar $false
        Avisar "Falha durante a verificação: $($_.Exception.Message)" 'Error'
    }
})

$btnCopiar.Add_Click({
    $linhas = New-Object System.Collections.Generic.List[string]
    $cab = @('Entrada', 'Tipo', 'Situação', "Resposta $($estado.servidor)")
    if ($estado.referencia) { $cab += "Resposta $($estado.referencia)" }
    $cab += 'Consultado em'
    $linhas.Add($cab -join "`t")
    $sel = Visiveis
    foreach ($r in $sel) {
        $c = @($r.Entrada, $r.Tipo, $r.Situacao, $r.Servidor)
        if ($estado.referencia) { $c += $r.Referencia }
        $c += $r.Quando
        $linhas.Add($c -join "`t")
    }
    [System.Windows.Forms.Clipboard]::SetText($linhas -join "`r`n")
    $lblStatus.Text = "$($sel.Count) linhas copiadas para a área de transferência."
})

$btnSalvar.Add_Click({
    $dlg = New-Object System.Windows.Forms.SaveFileDialog
    $dlg.Filter = 'CSV (*.csv)|*.csv'
    $dlg.FileName = 'bloqueio-dns-' + (Get-Date -Format 'yyyyMMdd-HHmm') + '.csv'
    if ($dlg.ShowDialog($form) -ne 'OK') { return }
    try {
        Para-Csv (Visiveis) $estado.servidor $estado.referencia | Out-File -LiteralPath $dlg.FileName -Encoding UTF8
        $lblStatus.Text = "Salvo em $($dlg.FileName)"
    } catch {
        Avisar "Não foi possível salvar: $($_.Exception.Message)" 'Error'
    }
})

$btnEvidencia.Add_Click({
    $dlg = New-Object System.Windows.Forms.SaveFileDialog
    $dlg.Filter = 'Texto (*.txt)|*.txt'
    $dlg.FileName = 'evidencia-bloqueio-dns-' + (Get-Date -Format 'yyyyMMdd-HHmm') + '.txt'
    if ($dlg.ShowDialog($form) -ne 'OK') { return }
    try {
        Para-Evidencia $estado.resultados.ToArray() $estado.servidor $estado.referencia | Out-File -LiteralPath $dlg.FileName -Encoding UTF8
        $lblStatus.Text = "Evidência salva em $($dlg.FileName)"
    } catch {
        Avisar "Não foi possível salvar: $($_.Exception.Message)" 'Error'
    }
})

$form.Add_Shown({ $txtEntrada.Focus() })

try {
    [void]$form.ShowDialog()
} catch {
    [void][System.Windows.Forms.MessageBox]::Show("Erro: $($_.Exception.Message)", 'Verifica Bloqueio DNS', 'OK', 'Error')
}
# Encerra mesmo que ainda haja consulta pendente em segundo plano
[Environment]::Exit(0)
