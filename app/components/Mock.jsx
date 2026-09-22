/**
 * Мини-макеты примеров.
 *
 * Это не скриншоты, а схемы: они весят сотни байт вместо сотен
 * килобайт, и их не надо пережимать при каждой правке. Цвета
 * берутся из тех же токенов, что и весь сайт, поэтому макет
 * никогда не разойдётся с оформлением.
 *
 * Классы m-* описаны в mock.css — там же, где им место: заливки
 * и обводки, а не расположение.
 */
import './mock.css';

const MOCKS = {
  'landing': (
    <svg viewBox="0 0 260 150" className="mock" role="img" aria-label="Макет сторінки">
    <rect className="m-plate" x="6" y="6" width="248" height="138" rx="3"/>
    <line className="m-rule" x1="6" y1="26" x2="254" y2="26"/>
    <rect className="m-acid" x="14" y="14" width="16" height="5" rx="1"/>
    <rect className="m-dim" x="196" y="15" width="14" height="3"/>
    <rect className="m-dim" x="216" y="15" width="14" height="3"/>
    <rect className="m-dim" x="236" y="15" width="10" height="3"/>
    <rect className="m-line" x="18" y="44" width="120" height="9" rx="1"/>
    <rect className="m-line" x="18" y="58" width="86" height="9" rx="1"/>
    <rect className="m-dim" x="18" y="76" width="104" height="3"/>
    <rect className="m-dim" x="18" y="83" width="76" height="3"/>
    <rect className="m-acid" x="18" y="96" width="52" height="15" rx="2"/>
    <rect className="m-frame" x="160" y="44" width="82" height="67" rx="2"/>
    <rect className="m-dim" x="168" y="54" width="40" height="3"/>
    <rect className="m-field" x="168" y="63" width="66" height="9" rx="1"/>
    <rect className="m-field" x="168" y="77" width="66" height="9" rx="1"/>
    <rect className="m-acid" x="168" y="93" width="34" height="10" rx="1"/>
    <line className="m-rule" x1="6" y1="124" x2="254" y2="124"/>
    <rect className="m-dim" x="18" y="132" width="54" height="3"/>
  </svg>
  ),
  'shop-bot': (
    <svg viewBox="0 0 260 150" className="mock" role="img" aria-label="Макет чату з оплатою">
    <rect className="m-plate" x="60" y="6" width="140" height="138" rx="3"/>
    <line className="m-rule" x1="60" y1="24" x2="200" y2="24"/>
    <circle className="m-acid-fill" cx="72" cy="15" r="4"/>
    <rect className="m-dim" x="82" y="13" width="40" height="4"/>
    <rect className="m-bubble" x="68" y="34" width="86" height="20" rx="3"/>
    <rect className="m-dim" x="76" y="41" width="60" height="3"/>
    <rect className="m-frame" x="68" y="60" width="124" height="42" rx="3"/>
    <rect className="m-fill" x="75" y="67" width="28" height="28" rx="2"/>
    <rect className="m-line" x="111" y="69" width="52" height="5" rx="1"/>
    <rect className="m-dim" x="111" y="79" width="34" height="3"/>
    <rect className="m-acid" x="111" y="86" width="24" height="8" rx="1"/>
    <rect className="m-acid" x="68" y="110" width="124" height="18" rx="3"/>
    <rect className="m-plate" x="104" y="116" width="52" height="6" rx="1" opacity=".85"/>
  </svg>
  ),
  'bot': (
    <svg viewBox="0 0 260 150" className="mock" role="img" aria-label="Макет розсилки">
    <rect className="m-plate" x="6" y="6" width="120" height="138" rx="3"/>
    <rect className="m-dim" x="16" y="18" width="44" height="4"/>
    <g className="m-rows">
      <rect className="m-field" x="16" y="32" width="100" height="14" rx="2"/>
      <rect className="m-field" x="16" y="52" width="100" height="14" rx="2"/>
      <rect className="m-field" x="16" y="72" width="100" height="14" rx="2"/>
      <rect className="m-field" x="16" y="92" width="100" height="14" rx="2"/>
      <rect className="m-field" x="16" y="112" width="100" height="14" rx="2"/>
    </g>
    <circle className="m-acid-fill" cx="25" cy="39" r="3"/>
    <circle className="m-acid-fill" cx="25" cy="59" r="3"/>
    <circle className="m-acid-fill" cx="25" cy="79" r="3"/>
    <rect className="m-plate" x="140" y="6" width="114" height="138" rx="3"/>
    <rect className="m-line" x="150" y="20" width="60" height="6" rx="1"/>
    <rect className="m-dim" x="150" y="34" width="94" height="3"/>
    <rect className="m-dim" x="150" y="42" width="80" height="3"/>
    <rect className="m-dim" x="150" y="50" width="88" height="3"/>
    <rect className="m-acid" x="150" y="66" width="46" height="12" rx="2"/>
    <line className="m-rule" x1="150" y1="92" x2="244" y2="92"/>
    <rect className="m-acid" x="150" y="102" width="70" height="8" rx="1"/>
    <rect className="m-dim" x="150" y="118" width="46" height="3"/>
  </svg>
  ),
  'webapp': (
    <svg viewBox="0 0 260 150" className="mock" role="img" aria-label="Макет панелі керування">
    <rect className="m-plate" x="6" y="6" width="248" height="138" rx="3"/>
    <line className="m-rule" x1="62" y1="6" x2="62" y2="144"/>
    <rect className="m-acid" x="14" y="16" width="18" height="5" rx="1"/>
    <rect className="m-dim" x="14" y="34" width="38" height="4"/>
    <rect className="m-dim" x="14" y="46" width="30" height="4"/>
    <rect className="m-dim" x="14" y="58" width="34" height="4"/>
    <rect className="m-acid" x="10" y="70" width="3" height="10"/>
    <rect className="m-line" x="18" y="72" width="30" height="4"/>
    <rect className="m-line" x="74" y="18" width="56" height="6" rx="1"/>
    <g className="m-bars">
      <rect className="m-fill" x="74" y="52" width="12" height="22"/>
      <rect className="m-fill" x="92" y="44" width="12" height="30"/>
      <rect className="m-acid-fill" x="110" y="32" width="12" height="42"/>
      <rect className="m-fill" x="128" y="48" width="12" height="26"/>
      <rect className="m-fill" x="146" y="38" width="12" height="36"/>
    </g>
    <line className="m-rule" x1="74" y1="74" x2="158" y2="74"/>
    <rect className="m-frame" x="172" y="32" width="70" height="42" rx="2"/>
    <rect className="m-acid" x="180" y="42" width="26" height="8" rx="1"/>
    <rect className="m-dim" x="180" y="58" width="46" height="3"/>
    <g className="m-table">
      <line className="m-rule" x1="74" y1="92" x2="242" y2="92"/>
      <rect className="m-dim" x="74" y="100" width="40" height="3"/>
      <rect className="m-dim" x="130" y="100" width="60" height="3"/>
      <rect className="m-acid" x="206" y="98" width="24" height="6" rx="1"/>
      <line className="m-rule" x1="74" y1="112" x2="242" y2="112"/>
      <rect className="m-dim" x="74" y="120" width="34" height="3"/>
      <rect className="m-dim" x="130" y="120" width="52" height="3"/>
      <rect className="m-fill" x="206" y="118" width="24" height="6" rx="1"/>
      <line className="m-rule" x1="74" y1="132" x2="242" y2="132"/>
    </g>
  </svg>
  ),
  'backend': (
    <svg viewBox="0 0 260 150" className="mock" role="img" aria-label="Схема API">
    <rect className="m-frame" x="10" y="52" width="52" height="44" rx="3"/>
    <rect className="m-dim" x="20" y="62" width="32" height="4"/>
    <rect className="m-dim" x="20" y="72" width="22" height="4"/>
    <rect className="m-dim" x="20" y="82" width="28" height="4"/>
    <path className="m-arrow" d="M64 68 H98"/>
    <path className="m-arrow-head" d="M94 64 L100 68 L94 72"/>
    <path className="m-arrow" d="M98 84 H64"/>
    <path className="m-arrow-head" d="M68 80 L62 84 L68 88"/>
    <rect className="m-acid-frame" x="100" y="44" width="60" height="60" rx="3"/>
    <rect className="m-acid" x="112" y="58" width="36" height="6" rx="1"/>
    <rect className="m-dim" x="112" y="70" width="26" height="4"/>
    <rect className="m-dim" x="112" y="80" width="32" height="4"/>
    <path className="m-arrow" d="M162 74 H196"/>
    <path className="m-arrow-head" d="M192 70 L198 74 L192 78"/>
    <g className="m-db">
      <ellipse className="m-frame" cx="224" cy="52" rx="24" ry="8"/>
      <path className="m-frame-line" d="M200 52 V96 A24 8 0 0 0 248 96 V52"/>
      <ellipse className="m-rule-fill" cx="224" cy="74" rx="24" ry="8"/>
    </g>
  </svg>
  ),
  'automation': (
    <svg viewBox="0 0 260 150" className="mock" role="img" aria-label="Макет збору даних">
    <rect className="m-frame" x="8" y="20" width="70" height="50" rx="3"/>
    <rect className="m-dim" x="16" y="30" width="30" height="3"/>
    <rect className="m-dim" x="16" y="38" width="46" height="3"/>
    <rect className="m-dim" x="16" y="46" width="38" height="3"/>
    <rect className="m-frame" x="8" y="82" width="70" height="50" rx="3"/>
    <rect className="m-dim" x="16" y="92" width="40" height="3"/>
    <rect className="m-dim" x="16" y="100" width="28" height="3"/>
    <rect className="m-dim" x="16" y="108" width="44" height="3"/>
    <path className="m-arrow" d="M80 45 C104 45 100 70 120 74"/>
    <path className="m-arrow" d="M80 107 C104 107 100 82 120 78"/>
    <path className="m-arrow-head" d="M116 70 L124 76 L115 80"/>
    <rect className="m-plate" x="128" y="30" width="124" height="90" rx="3"/>
    <line className="m-rule" x1="128" y1="48" x2="252" y2="48"/>
    <rect className="m-acid" x="136" y="37" width="30" height="5" rx="1"/>
    <rect className="m-dim" x="176" y="38" width="26" height="3"/>
    <rect className="m-dim" x="212" y="38" width="26" height="3"/>
    <g className="m-rows">
      <rect className="m-dim" x="136" y="58" width="30" height="3"/>
      <rect className="m-dim" x="176" y="58" width="26" height="3"/>
      <rect className="m-acid" x="212" y="56" width="18" height="5" rx="1"/>
      <line className="m-rule" x1="128" y1="68" x2="252" y2="68"/>
      <rect className="m-dim" x="136" y="76" width="24" height="3"/>
      <rect className="m-dim" x="176" y="76" width="30" height="3"/>
      <rect className="m-fill" x="212" y="74" width="18" height="5" rx="1"/>
      <line className="m-rule" x1="128" y1="86" x2="252" y2="86"/>
      <rect className="m-dim" x="136" y="94" width="34" height="3"/>
      <rect className="m-dim" x="176" y="94" width="22" height="3"/>
      <rect className="m-fill" x="212" y="92" width="18" height="5" rx="1"/>
      <line className="m-rule" x1="128" y1="104" x2="252" y2="104"/>
    </g>
  </svg>
  ),
  'custom': (
    <svg viewBox="0 0 260 150" className="mock" role="img" aria-label="Схема доопрацювання">
    <path className="m-arrow" d="M60 40 H108"/>
    <path className="m-arrow" d="M60 110 H108"/>
    <path className="m-arrow" d="M152 75 H196"/>
    <path className="m-arrow-head" d="M192 71 L198 75 L192 79"/>
    <rect className="m-frame m-broken" x="10" y="22" width="50" height="36" rx="3"/>
    <rect className="m-dim" x="18" y="32" width="26" height="3"/>
    <rect className="m-dim" x="18" y="40" width="18" height="3"/>
    <rect className="m-frame m-broken" x="10" y="92" width="50" height="36" rx="3"/>
    <rect className="m-dim" x="18" y="102" width="22" height="3"/>
    <rect className="m-dim" x="18" y="110" width="28" height="3"/>
    <rect className="m-acid-frame" x="108" y="46" width="44" height="58" rx="3"/>
    <path className="m-acid-stroke" d="M120 75 L128 83 L142 66"/>
    <rect className="m-plate" x="198" y="46" width="52" height="58" rx="3"/>
    <rect className="m-acid" x="208" y="58" width="32" height="6" rx="1"/>
    <rect className="m-line" x="208" y="72" width="24" height="4"/>
    <rect className="m-dim" x="208" y="84" width="30" height="3"/>
  </svg>
  )
};

export function Mock({ id }) {
  return MOCKS[id] || null;
}

export default Mock;
