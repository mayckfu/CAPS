import {
  RAAS_LEFT, RAAS_RIGHT, BPA_IND_LEFT, BPA_IND_RIGHT, BPA_CONSOLIDADO,
  dayKey, bpaKey, calcTotal, calcBpaTotal
} from '../../data/procedures';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function PBox({ label, children, style = {} }) {
  return (
    <div className="pbox" style={{ ...style, borderRight: '1px solid #000' }}>
      <label style={{ fontSize: '7px', fontWeight: '800' }}>{label}</label>
      <span style={{ fontSize: '10px', fontWeight: '600', color: '#000' }}>{children}</span>
    </div>
  );
}

function CBWrap({ label, val, sel }) {
  return (
    <div className="cb-wrap">
      <div className={`cb ${sel ? 'sel' : ''}`}>{sel ? 'X' : ''}</div>
      <label>{label || val}</label>
    </div>
  );
}

function ProcRow({ proc, record }) {
  const total = calcTotal(proc.code, record);
  return (
    <tr>
      <td className="pc">{proc.code}</td>
      <td className="pn">{proc.name}</td>
      {DAYS.map(d => (
        <td key={d} className="dy">{record[dayKey(proc.code, d)] || ''}</td>
      ))}
      <td className="tot">{total || ''}</td>
    </tr>
  );
}

function DayHeader() {
  return (
    <tr>
      <th style={{ width: 62 }}>Código</th>
      <th style={{ width: 100 }}>Descrição</th>
      {DAYS.map(d => <th key={d}>{d}</th>)}
      <th style={{ width: 25 }}>TOTAL</th>
    </tr>
  );
}

export default function PrintTemplate({ patient, record }) {
  if (!patient || !record) return null;

  return (
    <div className="print-page">
      {/* HEADER */}
      <header className="ph-header">
        <div className="ph-logos">
          <img src="/images/image_2.png" alt="Logo" />
          <img src="/images/image_1.png" alt="SUS" />
        </div>
        <div className="ph-title">
          <h1>INSTRUMENTO DE REGISTRO UNIFICADO</h1>
          <span className="caps-badge">CAPS</span>
        </div>
        <div className="ph-right">
          <div className="ph-top-row">
            <div className="box"><label>CBO:</label><span style={{ fontWeight: '800' }}>{record.cbo || ''}</span></div>
            <div className="box" style={{ borderRight: 0 }}><label>Mês de Referência:</label><span style={{ fontWeight: '800', fontSize: '12px' }}>{record.mesRef || ''}</span></div>
          </div>
          <div className="box" style={{ borderTop: '1px solid black' }}>
            <label>Unidade:</label>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#000' }}>6359825 – CAPS AD</span>
          </div>
        </div>
      </header>

      {/* PROFISSIONAL */}
      <div className="prow">
        <PBox label="Nº DO CARTÃO SUS DO PROFISSIONAL" style={{ flex: '0 0 180px' }}>{record.cartaoSusProfissional}</PBox>
        <PBox label="NOME DO PROFISSIONAL" style={{ flex: 1 }}>{record.nomeProfissional}</PBox>
      </div>

      {/* IDENTIFICAÇÃO PACIENTE */}
      <div className="prow">
        <PBox label="CNS" style={{ flex: '0 0 140px' }}>{patient.cns}</PBox>
        <PBox label="NOME" style={{ flex: 1 }}>{patient.nome}</PBox>
        <PBox label="DATA DE NASCIMENTO" style={{ flex: '0 0 100px' }}>{patient.dataNasc}</PBox>
        <div className="pbox" style={{ flex: '0 0 80px' }}>
          <label>Sexo:</label>
          <div className="cb-group">
            <CBWrap val="M" sel={patient.sexo === 'M'} />
            <CBWrap val="F" sel={patient.sexo === 'F'} />
          </div>
        </div>
        <div className="pbox" style={{ flex: '0 0 110px' }}>
          <label>RAÇA / COR:</label>
          <div className="cb-group" style={{ gap: 2 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className={`cb ${patient.raca?.startsWith(String(n)) ? 'sel' : ''}`} style={{ width: 10, height: 10, fontSize: 6 }}>{n}</div>
            ))}
          </div>
        </div>
        <PBox label="MUNICÍPIO" style={{ flex: '0 0 120px' }}>{patient.municipio}</PBox>
      </div>

      {/* ENDEREÇO */}
      <div className="prow">
        <div className="pbox" style={{ flex: '0 0 180px' }}>
          <label>LOGRADOURO: (R:Rua A:Avenida E:Estrada)</label>
          <div className="cb-group">
            <CBWrap label="R" sel={patient.logTipo === 'R'} />
            <CBWrap label="A" sel={patient.logTipo === 'A'} />
            <CBWrap label="E" sel={patient.logTipo === 'E'} />
            <span style={{ fontSize: '6px', marginLeft: 4 }}>OUTRO: {patient.logradouro}</span>
          </div>
        </div>
        <PBox label="Nº" style={{ flex: '0 0 50px' }}>{patient.numero}</PBox>
        <PBox label="DESCRIÇÃO DO ENDEREÇO" style={{ flex: 1 }}>{patient.descEndereco}</PBox>
        <PBox label="CEP" style={{ flex: '0 0 80px' }}>{patient.cep}</PBox>
      </div>

      {/* ROW 3 */}
      <div className="prow">
        <PBox label="NACIONALIDADE" style={{ flex: '0 0 120px' }}>{patient.nacionalidade}</PBox>
        <PBox label="TELEFONE" style={{ flex: '0 0 120px' }}>{patient.telefone}</PBox>
        <PBox label="NOME DA MÃE" style={{ flex: 1 }}>{patient.nomeMae}</PBox>
        <PBox label="NOME DO RESPONSÁVEL" style={{ flex: 1 }}>{patient.nomeResponsavel}</PBox>
        <div className="pbox" style={{ flex: '0 0 90px' }}>
          <label>EM SITUAÇÃO DE RUA?</label>
          <div className="cb-group">
            <CBWrap label="S" sel={patient.situacaoRua === 'S'} />
            <CBWrap label="N" sel={patient.situacaoRua === 'N'} />
          </div>
        </div>
      </div>

      {/* DADOS CLÍNICOS */}
      <div className="prow">
        <PBox label="DATA DE ADMISSÃO" style={{ flex: '0 0 100px' }}>{record.dataAdmissao}</PBox>
        <PBox label="CID PRINCIPAL" style={{ flex: '0 0 80px' }}>{record.cidPrincipal}</PBox>
        <PBox label="CID CAUSAS ASSOCIADAS" style={{ flex: '0 0 100px' }}>{record.cidCausas}</PBox>
        <div className="pbox" style={{ flex: 1 }}>
          <label>ORIGEM DO USUÁRIO:</label>
          <div className="cb-group">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className={`cb ${record.origemUsuario === String(n) ? 'sel' : ''}`} style={{ width: 10, height: 10, fontSize: 6 }}>{n}</div>
            ))}
          </div>
        </div>
        <div className="pbox" style={{ flex: '0 0 90px' }}>
          <label>COBERTURA ESF?</label>
          <div className="cb-group">
            <CBWrap label="S" sel={record.coberturaEsf === 'S'} />
            <CBWrap label="N" sel={record.coberturaEsf === 'N'} />
          </div>
        </div>
        <PBox label="UNIDADE" style={{ flex: 1 }}>{record.unidadeEsf}</PBox>
      </div>

      {/* DADOS CLÍNICOS 2 */}
      <div className="prow">
        <div className="pbox" style={{ flex: '0 0 150px' }}>
          <label>LOCAL DE REALIZAÇÃO DA AÇÃO:</label>
          <div className="cb-group">
            <CBWrap label="C" sel={record.localRealizacao === 'C'} />
            <CBWrap label="T" sel={record.localRealizacao === 'T'} />
          </div>
        </div>
        <div className="pbox" style={{ flex: 1 }}>
          <label>DESTINO DO USUÁRIO:</label>
          <div className="cb-group">
            {[0, 1, 2, 3, 4].map(n => (
              <div key={n} className={`cb ${record.destinoUsuario === String(n) ? 'sel' : ''}`} style={{ width: 10, height: 10, fontSize: 6 }}>{n}</div>
            ))}
          </div>
        </div>
      </div>

      {/* PROCEDIMENTOS RAAS */}
      <div className="sec-title">PROCEDIMENTOS DE RAAS</div>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1, borderRight: '1px solid black' }}>
          <table className="proc-table">
            <thead><DayHeader /></thead>
            <tbody>{RAAS_LEFT.map(p => <ProcRow key={p.code} proc={p} record={record} />)}</tbody>
          </table>
        </div>
        <div style={{ flex: 1 }}>
          <table className="proc-table">
            <thead><DayHeader /></thead>
            <tbody>{RAAS_RIGHT.map(p => <ProcRow key={p.code} proc={p} record={record} />)}</tbody>
          </table>
        </div>
      </div>

      {/* BPA INDIVIDUALIZADO */}
      <div className="sec-title">PROCEDIMENTOS DE BPA INDIVIDUALIZADO</div>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1, borderRight: '1px solid black' }}>
          <table className="proc-table">
            <thead><DayHeader /></thead>
            <tbody>{BPA_IND_LEFT.map(p => <ProcRow key={p.code} proc={p} record={record} />)}</tbody>
          </table>
        </div>
        <div style={{ flex: 1 }}>
          <table className="proc-table">
            <thead><DayHeader /></thead>
            <tbody>{BPA_IND_RIGHT.map(p => <ProcRow key={p.code} proc={p} record={record} />)}</tbody>
          </table>
        </div>
      </div>

      {/* BPA CONSOLIDADO */}
      <div className="sec-title">PROCEDIMENTOS DE BPA CONSOLIDADO</div>
      <div className="bpa-grid">
        {BPA_CONSOLIDADO.map((block, idx) => (
          <div key={idx} className="bpa-block">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 55 }}>Código</th>
                  <th style={{ textAlign: 'left' }}>Descrição</th>
                  <th style={{ width: 12 }}>1</th><th style={{ width: 12 }}>2</th><th style={{ width: 12 }}>3</th><th style={{ width: 12 }}>4</th>
                  <th style={{ width: 18 }}>TOT</th>
                </tr>
              </thead>
              <tbody>
                {block.map(proc => (
                  <tr key={proc.code}>
                    <td className="bc">{proc.code}</td>
                    <td className="bn">{proc.name}</td>
                    {[1, 2, 3, 4].map(c => <td key={c}>{record[bpaKey(proc.code, c)] || ''}</td>)}
                    <td style={{ fontWeight: 'bold', background: '#eee' }}>{calcBpaTotal(proc.code, record) || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="cid-bar">
        CID P/ ACOLHIMENTO INICIAL: <span style={{ marginLeft: 10, fontWeight: 'normal' }}>{record.cidAcolhimento}</span>
      </div>
    </div>
  );
}

