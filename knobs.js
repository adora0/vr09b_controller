/*carico i valori di default per i parametri del sintetizzatore*/
const paramConfig = {
    'osc-wave': { min: 0, max: 7, default: 0 },
    'osc-wave-variation': { min: 0, max: 7, default: 0 },
    'osc-pitch': { min: 40, max: 88, default: 64 },
    'osc-detune': { min: 14, max: 114, default: 0 },
    'osc-pw-mod-depth': { min: 0, max: 127, default: 0 },
    'osc-pw': { min: 0, max: 127, default: 64 },
    'osc-pitch-env-attack': { min: 0, max: 127, default: 0 },
    'osc-pitch-env-decay': { min: 0, max: 127, default: 64 },
    'osc-pitch-env-depth': { min: 1, max: 127, default: 0 },

    'filter-mode': { min: 0, max: 5, default: 0 },
    'filter-slope': { min: 0, max: 1, default: 0 },
    'filter-cutoff': { min: 0, max: 127, default: 64 },
    'filter-cutoff-keyfollow': { min: 54, max: 74, default: 0 },
    'filter-resonance': { min: 0, max: 127, default: 0 },
    'filter-env-attack': { min: 0, max: 127, default: 0 },
    'filter-env-decay': { min: 0, max: 127, default: 64 },
    'filter-env-sustain': { min: 0, max: 127, default: 127 },
    'filter-env-release': { min: 0, max: 127, default: 64 },
    'filter-env-depth': { min: 1, max: 127, default: 0 },

    'lfo-shape': { min: 0, max: 5, default: 0 },
    'lfo-rate': { min: 0, max: 127, default: 64 },
    'lfo-tempo-sync': { min: 0, max: 1, default: 0 },
    'lfo-tempo-sync-note': { min: 0, max: 15, default: 0 },
    'lfo-fade-time': { min: 0, max: 127, default: 0 },
    'lfo-pitch-depth': { min: 1, max: 127, default: 0 },
    'lfo-filter-depth': { min: 1, max: 127, default: 0 },
    'lfo-amp-depth': { min: 1, max: 127, default: 0 },

    'mod-lfo-shape': { min: 0, max: 5, default: 0 },
    'mod-lfo-rate': { min: 0, max: 127, default: 64 },
    'mod-lfo-tempo-sync': { min: 0, max: 1, default: 0 },
    'mod-lfo-tempo-sync-note': { min: 0, max: 15, default: 0 },
    'mod-lfo-pitch-depth': { min: 1, max: 127, default: 0 },
    'mod-lfo-filter-depth': { min: 1, max: 127, default: 0 },
    'mod-lfo-amp-depth': { min: 1, max: 127, default: 0 }
};

document.querySelectorAll('.knob').forEach(knob => {
    let isDragging = false;
    let startY;
    let tempValue = 0;
    const paramId = knob.id.replace('-knob', '');
    const config = paramConfig[paramId]; // Accedi al min/max/default

    // Doppio clic = reset valore a default
    knob.addEventListener('dblclick', () => {
        tempValue = config.default;
        sendAndStoreParam(paramId, tempValue);
       
    });

    const onStart = (e) => {
        isDragging = true;
        startY = e.clientY || e.touches[0].clientY;
        tempValue = oscillatorStates[activeOscId][paramId];
        e.preventDefault();
    };

    const onEnd = () => {
        if (isDragging) {
            sendAndStoreParam(paramId, tempValue);
            isDragging = false;
        }
    };

    const onMove = (e) => {
        if (!isDragging) return;
        const y = e.clientY || e.touches[0].clientY;
        const delta = startY - y;
        startY = y;

        tempValue += Math.round(delta / 4);
        tempValue = Math.max(config.min, Math.min(config.max, tempValue));

        updateKnobVisual(knob, tempValue); // funzione per aggiornare la UI
    };

    knob.addEventListener('mousedown', onStart);
    knob.addEventListener('touchstart', onStart);

    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove);
});


function valueToAngle(value) {
    return ((value + 24) / 48) * 270 - 135;
}

function valueToAngle(textValue, min, max) {
    // textValue va da (min-center) a (max-center), es: -24 a +24
    // L'angolo va da -135° a +135°
    const range = max - min;
    return ((textValue - min) / range) * 270 - 135;
}

function updateKnobVisual(knobEl, value) {
    const paramId = knobEl.id.replace('-knob', '');
    const min = paramConfig[paramId].min;
    const max = paramConfig[paramId].max;
    const centerValue = (max + min) / 2;
    let textValue = Math.round(parseInt(value) - centerValue);

    // Limita textValue ai limiti reali centrati
    const minText = min - centerValue;
    const maxText = max - centerValue;
    textValue = Math.max(minText, Math.min(maxText, textValue));

    // Calcola l'angolo in base a textValue e range reale
    const angle = valueToAngle(textValue, minText, maxText);
    knobEl.style.transform = `rotate(${angle}deg)`;

    document.getElementById(`${paramId}-value`).textContent = textValue;
}

function sendAndStoreParam(paramId, value) {
    oscillatorStates[activeOscId][paramId] = value;
    updateKnobVisual(document.getElementById(`${paramId}-knob`), value);
    const result = sendParameterValue(paramId, value);
}