// DOM Elements
            const connectBtn = document.getElementById('connect-btn');
            const statusEl = document.getElementById('status');
            const sendAllBtn = document.getElementById('send-all-btn');
            const tabButtons = document.querySelectorAll('.tab-btn');
            const tabPanels = document.querySelectorAll('.tab-panel');
            const logsContainer = document.querySelector('.logs');

            const rdosc1 = document.getElementById('radioosc1') ;
            const rdosc0 = document.getElementById('radioosc0') ;
            const rdosc2 = document.getElementById('radioosc2') ;
            const rdosc3 = document.getElementById('radioosc3') ;
           
            rdosc1.disabled = true;
            rdosc0.disabled = true;
            rdosc2.disabled = true;
            rdosc3.disabled = true;

            // MIDI variables
            let testMode = false; // Flag per abilitare la modalità test
            console.log('TestMode:', testMode);
            let midiAccess = null;
            let midiOutput = null;
            const ROLAND_MANUFACTURER_ID = 0x41;
            const DEVICE_ID = 0x10;
            const MODEL_ID = [0x00, 0x00, 0x71];
            const COMMAND_ID = 0x12;
            const UPPER_ID = [0x19, 0x41];
            OSCILLATOR_ID = 0x00;


            // Parameters mapping
            const parameterAddresses = {
                // Oscillator parameters
                'osc-wave': 0x00,
                'osc-wave-variation': 0x01,
                'osc-pitch': 0x03,
                'osc-detune': 0x04,
                'osc-pw-mod-depth': 0x05,
                'osc-pw': 0x06,
                'osc-pitch-env-attack': 0x07,
                'osc-pitch-env-decay': 0x08,
                'osc-pitch-env-depth': 0x09,

                // Filter parameters
                'filter-mode': 0x0A,
                'filter-slope': 0x0B,
                'filter-cutoff': 0x0C,
                'filter-cutoff-keyfollow': 0x0D,
                'filter-resonance': 0x0F,
                'filter-env-attack': 0x10,
                'filter-env-decay': 0x11,
                'filter-env-sustain': 0x12,
                'filter-env-release': 0x13,
                'filter-env-depth': 0x14,

                // LFO parameters
                'lfo-shape': 0x1C,
                'lfo-rate': 0x1D,
                'lfo-tempo-sync': 0x1E,
                'lfo-tempo-sync-note': 0x1F,
                'lfo-fade-time': 0x20,
                'lfo-pitch-depth': 0x22,
                'lfo-filter-depth': 0x23,
                'lfo-amp-depth': 0x24,

                // Modulation LFO parameters
                'mod-lfo-shape': 0x26,
                'mod-lfo-rate': 0x27,
                'mod-lfo-tempo-sync': 0x28,
                'mod-lfo-tempo-sync-note': 0x29,
                'mod-lfo-pitch-depth': 0x2C,
                'mod-lfo-filter-depth': 0x2D,
                'mod-lfo-amp-depth': 0x2E
            };

            // Bidirectional parameters (convert between display and actual values)
            const bidirectionalParams = [
                'osc-pitch', 'osc-detune', 'osc-pitch-env-depth',
                'filter-cutoff-keyfollow', 'filter-env-depth',
                'lfo-pitch-depth', 'lfo-filter-depth', 'lfo-amp-depth',
                'mod-lfo-pitch-depth', 'mod-lfo-filter-depth', 'mod-lfo-amp-depth'
            ];

            // Initialize all range inputs to update their displayed values
            document.querySelectorAll('input[type="range"]').forEach(slider => {
                const valueEl = document.getElementById(`${slider.id}-value`);
                if (!valueEl) return;

                // Set initial value
                if (bidirectionalParams.includes(slider.id)) {
                    const centerValue = (parseInt(slider.min) + parseInt(slider.max)) / 2;
                    valueEl.textContent = Math.round(parseInt(slider.value) - centerValue);
                } else {
                    valueEl.textContent = slider.value;
                }

                // Add event listener
                slider.addEventListener('input', () => {
                    if (bidirectionalParams.includes(slider.id)) {
                        const centerValue = (parseInt(slider.min) + parseInt(slider.max)) / 2;
                        valueEl.textContent = Math.round(parseInt(slider.value) - centerValue);
                    } else {
                        valueEl.textContent = slider.value;
                    }
                });
            });

            // Tab switching
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tabId = button.getAttribute('data-tab');

                    // Update active button
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');

                    // Show active panel
                    tabPanels.forEach(panel => {
                        panel.style.display = panel.id === tabId ? 'block' : 'none';
                    });
                });
            });

            // Connect to MIDI devices
            connectBtn.addEventListener('click', async () => {
                try {
                    if (!midiAccess) {
                        if (navigator.requestMIDIAccess) {
                            midiAccess = await navigator.requestMIDIAccess({ sysex: true });
                            logMessage('Accesso MIDI ottenuto', 'success');
                            statusEl.textContent = 'Stato: Connesso al sistema MIDI';
                            connectBtn.textContent = 'Seleziona VR-09B';

                            // Now list available MIDI outputs
                            showMidiOutputSelection();
                        } else {
                            logMessage('Web MIDI API non supportata dal browser', 'error');
                            statusEl.textContent = 'Stato: API MIDI non supportata';
                        }
                    } else if (!midiOutput) {
                        showMidiOutputSelection();
                    } else {
                        // Already connected, do nothing or reconnect
                        midiOutput = null;
                        connectBtn.textContent = 'Seleziona VR-09B';
                        statusEl.textContent = 'Stato: Disconnesso dalla VR-09B';
                        showMidiOutputSelection();
                    }
                } catch (err) {
                    logMessage('Errore di connessione MIDI: ' + err.message, 'error');
                    statusEl.textContent = 'Stato: Errore di connessione';
                }
            });

            // Show MIDI output selection dialog

            function showMidiOutputSelection() {
                // Clear previous outputs list
                const existingSelect = document.getElementById('midi-output-select');
                if (existingSelect) {
                    existingSelect.remove();
                }

                // Create select element
                const selectEl = document.createElement('select');
                selectEl.id = 'midi-output-select';
                selectEl.style.margin = '10px 0';
                selectEl.style.width = '100%';
                selectEl.style.padding = '8px';

                // Add default option
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = '-- Seleziona dispositivo MIDI --';
                selectEl.appendChild(defaultOption);

                // Add options for each MIDI output
                let hasOutputs = false;
                midiAccess.outputs.forEach(output => {
                    hasOutputs = true;
                    const option = document.createElement('option');
                    option.value = output.id;
                    option.textContent = output.name || `Dispositivo ${output.id}`;
                    selectEl.appendChild(option);
                });

                if (!hasOutputs) {
                    logMessage('Nessun dispositivo MIDI di output trovato', 'error');
                    return;
                }

                // Add to DOM before connect button
                connectBtn.parentNode.insertBefore(selectEl, connectBtn);

                // Add change event
                selectEl.addEventListener('change', (e) => {
                    const selectedId = e.target.value;
                    if (selectedId) {
                        midiOutput = midiAccess.outputs.get(selectedId);
                        statusEl.textContent = `Stato: Connesso a ${midiOutput.name || 'VR-09B'}`;
                        connectBtn.textContent = 'Disconnetti MIDI';
                        logMessage(`Connesso a ${midiOutput.name || 'VR-09B'}`, 'success');
                        selectEl.remove();
                    }
                });
            }

            // Send parameter value to VR-09B
            function sendParameterValue(paramId, value) {
                if (!midiOutput && !testMode) {
                    logMessage('Nessun dispositivo MIDI connesso', 'error');
                    return false;
                }
                const address = parameterAddresses[paramId];
                if (address === undefined) {
                    logMessage(`Indirizzo parametro sconosciuto: ${paramId}`, 'error');
                    return false;
                }

                try {
                    // Trova tutti i radiobutton con il nome 'osc-wave-variation'
                    const oscSelected = document.querySelectorAll('input[name="osc-wave-variation"]:checked');
                    if (oscSelected.length === 0) {
                        logMessage('Nessun oscillatore selezionato', 'error');
                        return false;
                    }

                    oscSelected.forEach((radio) => {
                        if (radio.value == 0) {
                            // Invia a tutti gli oscillatori accesi
                            const oscList = [];
                            if (!rdosc1.disabled) oscList.push(rdosc1.value);
                            if (!rdosc2.disabled) oscList.push(rdosc2.value);
                            if (!rdosc3.disabled) oscList.push(rdosc3.value);

                            oscList.forEach(oscId => {
                                OSCILLATOR_ID = oscId;
                                const sysexMessage = [
                                    0xF0,
                                    ROLAND_MANUFACTURER_ID,
                                    DEVICE_ID,
                                    ...MODEL_ID,
                                    COMMAND_ID,
                                    ...UPPER_ID,
                                    OSCILLATOR_ID,
                                    address,
                                    parseInt(value),
                                    0x00,
                                    0xF7
                                ];

                                // Calcolo checksum
                                let checksum = 0;
                                for (let i = 1; i < sysexMessage.length - 2; i++) {
                                    checksum += sysexMessage[i];
                                }
                                checksum = 128 - (checksum % 128);
                                sysexMessage[sysexMessage.length - 2] = checksum;

                                if (testMode) {
                                    console.log('TestMode: SysEx generato:', formatSysEx(sysexMessage));
                                } else {
                                    midiOutput.send(new Uint8Array(sysexMessage));
                                    logMessage(`Parametro inviato: ${paramId} = ${value} - ` + formatSysEx(sysexMessage), 'info');
                                }
                            });
                        } else {
                            // Invia solo all'oscillatore selezionato
                            OSCILLATOR_ID = radio.value;
                            const sysexMessage = [
                                0xF0,
                                ROLAND_MANUFACTURER_ID,
                                DEVICE_ID,
                                ...MODEL_ID,
                                COMMAND_ID,
                                ...UPPER_ID,
                                OSCILLATOR_ID,
                                address,
                                parseInt(value),
                                0x00,
                                0xF7
                            ];

                            // Calcolo checksum
                            let checksum = 0;
                            for (let i = 1; i < sysexMessage.length - 2; i++) {
                                checksum += sysexMessage[i];
                            }
                            checksum = 128 - (checksum % 128);
                            sysexMessage[sysexMessage.length - 2] = checksum;

                            if (testMode) {
                                console.log('TestMode: SysEx generato:', formatSysEx(sysexMessage));
                            } else {
                                midiOutput.send(new Uint8Array(sysexMessage));
                                logMessage(`Parametro inviato: ${paramId} = ${value} - ` + formatSysEx(sysexMessage), 'info');
                            }
                        }
                    });

                    return true;
                } catch (error) {
                    logMessage(`Errore nell'invio del parametro: ${error.message}`, 'error');
                    return false;
                }
            }

            // accende o spegne l'oscilallatore
            function setOscOn(osc, status) {

                if (!midiOutput && !testMode) {
                    logMessage('Nessun dispositivo MIDI connesso', 'error');
                    return false;
                }
                const address = 0x00;

                OSCILLATOR_ID = parseInt(osc);
                try {

                    // Format for Roland system exclusive message
                    // F0 41 10 00 00 00 0F address value checksum F7
                    const sysexMessage = [
                        0xF0,                // Start of SysEx
                        ROLAND_MANUFACTURER_ID, // Roland ID
                        DEVICE_ID,          // Device ID
                        ...MODEL_ID,        // Model ID
                        COMMAND_ID, 		//Command ID
                        ...UPPER_ID,			//upper 1941
                        address,      // 0x00 address for oscillator on/off
                        OSCILLATOR_ID,            // Oscillator ID
                        parseInt(status),    // Parameter value
                        0x00,               // Checksum placeholder
                        0xF7                // End of SysEx
                    ];

                    // Calculate checksum (Roland format)
                    let checksum = 0;
                    for (let i = 1; i < sysexMessage.length - 2; i++) {
                        checksum += sysexMessage[i];
                    }
                    checksum = 128 - (checksum % 128);
                    sysexMessage[sysexMessage.length - 2] = checksum;
                    
                    if (testMode) {
                        console.log('TestMode: SysEx generato:', formatSysEx(sysexMessage));
                        return true;
                    }

                    // Send the message                                      
                    midiOutput.send(new Uint8Array(sysexMessage));
                    logMessage(`Parametro inviato: ${paramId} = ` + formatSysEx(sysexMessage), 'info');
                    return true;
                } catch (error) {             
                    logMessage(`Errore nell'invio del parametro: ${error.message}`, 'error');
                    return false;
                }
            }

            function formatSysEx(sysex) {
                return Array.from(sysex)
                    .map(byte => byte.toString(16).padStart(2, '0').toUpperCase()) // Formatta ogni byte in esadecimale
                    .join(' '); // Inserisce uno spazio tra i byte
            }

            // Send all parameters to the VR-09B
            sendAllBtn.addEventListener('click', () => {
                if (!midiOutput && !testMode) {
                    logMessage('Nessun dispositivo MIDI connesso', 'error');
                    return;
                }

                let successCount = 0;
                let failCount = 0;

                // Process all inputs
                document.querySelectorAll('select, input[type="range"]').forEach(element => {
                    if (element.id !== 'midi-output-select') {
                        
                        const result = sendParameterValue(element.id, element.value);
                        if (result) {
                            successCount++;
                        } else {
                            failCount++;
                        }
                    }
                });

                logMessage(`Invio completato: ${successCount} parametri inviati, ${failCount} falliti`,
                    failCount > 0 ? 'error' : 'success');
            });

            // Add event listeners to all parameters for real-time control
            document.querySelectorAll('select, input[type="range"]').forEach(element => {
     
                if (element.id !== 'midi-output-select') {
                    element.addEventListener('change', () => {
                        if (midiOutput) {
                            sendParameterValue(element.id, element.value);
                        }
                    });

                    // For sliders, also update while dragging
                    if (element.type === 'range') {
                        element.addEventListener('input', () => {
                            if (midiOutput) {
                                sendParameterValue(element.id, element.value);
                            }
                        });
                    }
                }
            });
          
            function updateOscillatorStatus() {
                const oscWaveVariationSelect = document.getElementById('osc-wave-variation');
                const oscWave = document.getElementById('osc-wave');
                const osc1 = document.getElementById('switch1').checked;
                const osc2 = document.getElementById('switch2').checked;
                const osc3 = document.getElementById('switch3').checked;                      

                // Abilita o no i radio button in base allo stato degli switch
                if (osc1) {
                    rdosc1.disabled = false;                    
                    setOscOn('25', '1');
                } else {
                    rdosc1.disabled = true;                    
                    setOscOn('25', '0');
                }
                if (osc2) {
                    rdosc2.disabled = false;                   
                    setOscOn('27', '1');
                }
                else {
                    rdosc2.disabled = true;
                    setOscOn('27', '0');

                }
                if (osc3) {
                    rdosc3.disabled = false;
                    setOscOn('29', '1');

                }
                else {
                    rdosc3.disabled = true;
                    setOscOn('29', '0');

                }

                // Add default option if no oscillators are ON
                if (osc1 || osc2 || osc3) {                   
                    rdosc0.disabled = false;
                }else {
                    rdosc0.disabled = true;
                }

            }
            // Add event listeners to update status when checkboxes are toggled
            document.getElementById('switch1').addEventListener('change', updateOscillatorStatus);
            document.getElementById('switch2').addEventListener('change', updateOscillatorStatus);
            document.getElementById('switch3').addEventListener('change', updateOscillatorStatus);



            // Helper function to log messages
            function logMessage(message, type = 'info') {
                const logEntry = document.createElement('div');
                logEntry.className = `log-entry ${type}`;
                logEntry.textContent = message;

                // Add timestamp
                const now = new Date();
                const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                logEntry.textContent = `[${timestamp}] ${message}`;

                // Add to log container
                logsContainer.appendChild(logEntry);

                // Auto-scroll to bottom
                logsContainer.scrollTop = logsContainer.scrollHeight;

                // Limit number of log entries
                const maxLogEntries = 50;
                while (logsContainer.children.length > maxLogEntries) {
                    logsContainer.removeChild(logsContainer.firstChild);
                }
            }

            // Check for Web MIDI API support on page load
            window.addEventListener('load', () => {
                if (!navigator.requestMIDIAccess) {
                    logMessage('Il browser non supporta Web MIDI API', 'error');
                    statusEl.textContent = 'Stato: Web MIDI API non supportata';
                    connectBtn.disabled = true;
                } else {
                    logMessage('Web MIDI API supportata. Premi "Connetti MIDI" per iniziare.', 'info');
                }
            });
