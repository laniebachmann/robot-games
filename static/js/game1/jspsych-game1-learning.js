/**
 * jspsych-palminteri-learning
 * Sam Zorowitz
 *
 * plugin for running a learning trial of the Palminteri task
 *
 **/

jsPsych.plugins["palminteri-learning"] = (function() {

  var response_keys = ['leftarrow','rightarrow'];

  var plugin = {};

  plugin.info = {
    name: 'palminteri-learning',
    description: '',
    parameters: {
      symbol_L: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Symbol (left)',
        default: '',
        description: 'Key code of corresponding symbol for left robot'
      },
      symbol_R: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Symbol (right)',
        default: '',
        description: 'Key code of corresponding symbol for right robot'
      },
      outcome_L: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Feedback (left)',
        description: 'Outcome for left robot.'
      },
      outcome_R: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Feedback (right)',
        description: 'Outcome for right robot.'
      },
      correct: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        pretty_name: 'Correct',
        description: 'The key corresponding to the better robot.'
      },
      counterfactual: {
        type: jsPsych.plugins.parameterType.BOOLEAN,
        pretty_name: 'Counterfactual feedback',
        default: true,
        description: 'Present feedback for both chosen and unchosen stimuli.'
      },
      choices: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        array: true,
        pretty_name: 'Choices',
        default: ['leftarrow','rightarrow'], // leftarrow - left, rightarrow - right
        description: 'The keys the subject is allowed to press to respond to the stimulus.'
      },
      choice_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: 5000, // self-paced choice with a 5s "too slow" backstop
        description: 'Duration of choice selection phase.'
      },
      robot_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Robot duration',
        default: 500,
        description: 'Duration of choice indication phase.'
      },
      feedback_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Feedback duration',
        default: 2000,
        description: 'Duration of outcome phase.'
      },
      feedback_win: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Feedback (win)',
        default: "+10",
        description: 'Feedback for win outcome.'
      },
      feedback_zero: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Feedback (neutral)',
        default: "+0",
        description: 'Feedback for neutral outcome.'
      },
      feedback_lose: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Feedback (lose)',
        default: "-10",
        description: 'Feedback for lose outcome.'
      }
    }
  }

  plugin.trial = function(display_element, trial) {

    //---------------------------------------//
    // Define HTML.
    //---------------------------------------//

    // Initialize HTML.
    var new_html = `<style>
    body {
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
      position: fixed;
      background: linear-gradient(0deg, rgba(210,210,210,1) 50%, rgba(230,230,230,1) 100%);
    }

    </style>`;

    // Draw task
    new_html += '<div class="wrap">';
    new_html += '<div class="floor"></div>'

    // Draw screens
    new_html += '<div class="screen" side="left"><div class="screen-msg" id="screenL"></div></div>';
    new_html += '<div class="screen" side="right"><div class="screen-msg" id="screenR"></div></div>';

    // Draw platforms
    new_html += '<div class="platform" id="platformL" side="left"></div>';
    new_html += '<div class="ring" id="ringL" side="left"></div>';
    new_html += '<div class="platform" id="platformR" side="right"></div>';
    new_html += '<div class="ring" id="ringR" side="right"></div>';

    // Draw left robot.
    new_html += '<div class="robot" side="left">';
    new_html += '<div class="head">';
    new_html += '<div class="visor"></div>';
    new_html += '<div class="eye" id="eyeLL" side="left"></div>';
    new_html += '<div class="eye" id="eyeLR" side="right"></div>';
    new_html += '</div>';
    new_html += '<div class="torso">';
    new_html += '<div class="left"></div>';
    new_html += '<div class="right"></div>';
    new_html += `<div class="rune" id="runeL">${trial.symbol_L}</div>`;
    new_html += '</div>';
    new_html += '<div class="shado"></div>'
    new_html += '</div>';

    // Draw right robot.
    new_html += '<div class="robot" side="right">';
    new_html += '<div class="head">';
    new_html += '<div class="visor"></div>';
    new_html += '<div class="eye" id="eyeRL" side="left"></div>';
    new_html += '<div class="eye" id="eyeRR" side="right"></div>';
    new_html += '</div>';
    new_html += '<div class="torso">';
    new_html += '<div class="left"></div>';
    new_html += '<div class="right"></div>';
    new_html += `<div class="rune" id="runeR">${trial.symbol_R}</div>`;
    new_html += '</div>';
    new_html += '<div class="shado"></div>'
    new_html += '</div>';

    new_html += '</div>';

    // draw
    display_element.innerHTML = new_html;

    //---------------------------------------//
    // Task functions.
    //---------------------------------------//

    // store response
    var response = {
      rt: null,
      key: null
    };

    var trial_onset_date_now                = Date.now();
    var time_of_response_date_now           = null;
    var choice_indication_onset_date_now    = null;
    var choice_indication_offset_date_now   = null;
    var feedback_onset_date_now             = null;
    var feedback_offset_date_now            = null;
    var trial_offset_date_now               = null;
    var fixation_onset_date_now             = null;
    var fixation_offset_date_now            = null;

    // function to handle responses by the subject
    var after_response = function(info) {
      time_of_response_date_now = Date.now();
      choice_indication_onset_date_now = Date.now();

      // Kill any timeout handlers / keyboard listeners
      jsPsych.pluginAPI.clearAllTimeouts();
      jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);

      // Only record the first response
      if (response.key == null) {
        response = info;
      }

      // Visually indicate chosen robot.
      if (response.key == jsPsych.pluginAPI.convertKeyCharacterToKeyCode(response_keys[0])) {
        display_element.querySelector('#ringL').setAttribute('status', 'chosen');
      } else {
        display_element.querySelector('#ringR').setAttribute('status', 'chosen');
      }

      trial_onset = onset;
      trial_duration = response.rt;
      onset += trial_duration;

      // Robot-indication phase ends a fixed robot_duration after the response
      // (previously padded out to a constant total trial length for fMRI
      // deconvolution; online, the deliberation phase should end on keypress).
      jsPsych.pluginAPI.setTimeout(function() {
        choice_indication_offset_date_now = Date.now();
        choice_indication_onset = onset;
        choice_indication_duration = trial.robot_duration;
        onset += choice_indication_duration;
        present_feedback();
      }, trial.robot_duration);

    };

    // function to end trial when it is time
    var present_feedback = function() {
      feedback_onset_date_now = Date.now();

      // Kill any timeout handlers / keyboard listeners
      jsPsych.pluginAPI.clearAllTimeouts();
      if (typeof keyboardListener !== 'undefined') {
        jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
      }

      // Update left side outcome
      if (response.key == jsPsych.pluginAPI.convertKeyCharacterToKeyCode(response_keys[0]) || trial.counterfactual) {
        if (trial.outcome_L == 'win') {
          display_element.querySelector('#screenL').innerHTML = trial.feedback_win;
          display_element.querySelector('#screenL').setAttribute('outcome', 'win');
          display_element.querySelector('#runeL').setAttribute('outcome', 'win');
          display_element.querySelector('#eyeLL').setAttribute('outcome', 'win');
          display_element.querySelector('#eyeLR').setAttribute('outcome', 'win');
        } else if (trial.outcome_L == 'lose') {
          display_element.querySelector('#screenL').innerHTML = trial.feedback_lose;
          display_element.querySelector('#screenL').setAttribute('outcome', 'lose');
          display_element.querySelector('#runeL').setAttribute('outcome', 'lose');
          display_element.querySelector('#eyeLL').setAttribute('outcome', 'lose');
          display_element.querySelector('#eyeLR').setAttribute('outcome', 'lose');
        } else {
          display_element.querySelector('#screenL').innerHTML = trial.feedback_zero;
          display_element.querySelector('#screenL').setAttribute('outcome', 'zero');
          display_element.querySelector('#runeL').setAttribute('outcome', 'zero');
          display_element.querySelector('#eyeLL').setAttribute('outcome', 'zero');
          display_element.querySelector('#eyeLR').setAttribute('outcome', 'zero');
        }
      }

      // Update right side outcome
      if (response.key == jsPsych.pluginAPI.convertKeyCharacterToKeyCode(response_keys[1]) || trial.counterfactual) {
        if (trial.outcome_R == 'win') {
          display_element.querySelector('#screenR').innerHTML = trial.feedback_win;
          display_element.querySelector('#screenR').setAttribute('outcome', 'win');
          display_element.querySelector('#runeR').setAttribute('outcome', 'win');
          display_element.querySelector('#eyeRL').setAttribute('outcome', 'win');
          display_element.querySelector('#eyeRR').setAttribute('outcome', 'win');
        } else if (trial.outcome_R == 'lose') {
          display_element.querySelector('#screenR').innerHTML = trial.feedback_lose;
          display_element.querySelector('#screenR').setAttribute('outcome', 'lose');
          display_element.querySelector('#runeR').setAttribute('outcome', 'lose');
          display_element.querySelector('#eyeRL').setAttribute('outcome', 'lose');
          display_element.querySelector('#eyeRR').setAttribute('outcome', 'lose');
        } else {
          display_element.querySelector('#screenR').innerHTML = trial.feedback_zero;
          display_element.querySelector('#screenR').setAttribute('outcome', 'zero');
          display_element.querySelector('#runeR').setAttribute('outcome', 'zero');
          display_element.querySelector('#eyeRL').setAttribute('outcome', 'zero');
          display_element.querySelector('#eyeRR').setAttribute('outcome', 'zero');
        }
      }

      jsPsych.pluginAPI.setTimeout(function() {
        feedback_offset_date_now = Date.now();
        feedback_onset = onset;
        feedback_duration = trial.feedback_duration;
        onset += feedback_duration;
        show_fixation();
        //end_trial();
      }, trial.feedback_duration);

    };

    var show_fixation = function() {
      fixation_onset_date_now = Date.now();

      let orig_html = display_element.innerHTML;
      // clear the display
      display_element.innerHTML = '';

      var new_html = `<style>
        body {
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
          position: fixed;
          background: linear-gradient(0deg, rgba(210,210,210,1) 50%, rgba(230,230,230,1) 100%);
        }
        </style>`;

      // Draw task
      new_html += '<div style="font-size:150px;position: absolute;top: 50%;left:50%;transform: translateX(-40px);text-align: center;">+</div>';
      new_html += '<div class="wrap">';
      new_html += '<div class="floor"></div>'

      display_element.innerHTML = new_html;

      jitter = random_learning_jitter();

      jsPsych.pluginAPI.setTimeout(function() {
        fixation_offset_date_now = Date.now();
        fixation_onset = onset;
        fixation_duration = jitter;
        onset += fixation_duration;
        // move on to the next trial
        display_element.innerHTML = orig_html;
        end_trial();
      }, jitter);
    }

    // function to handle missed responses
    var missed_response = function() {
      feedback_onset_date_now = Date.now();

      // Kill all setTimeout handlers.
      jsPsych.pluginAPI.clearAllTimeouts();
      jsPsych.pluginAPI.cancelAllKeyboardResponses();

      let orig_html = display_element.innerHTML;
      // clear the display
      display_element.innerHTML = '';

      var new_html = `<style>
        body {
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
          position: fixed;
          background: linear-gradient(0deg, rgba(210,210,210,1) 50%, rgba(230,230,230,1) 100%);
        }
        </style>`;

      // Draw task
      new_html += '<div style="font-size:20px;position: absolute;top: 50%;left:50%;transform: translateX(-38px);text-align: center;">Too slow!</div>';
      new_html += '<div class="wrap">';
      new_html += '<div class="floor"></div>'

      display_element.innerHTML = new_html;

      jsPsych.pluginAPI.setTimeout(function() {
        feedback_offset_date_now = Date.now();
        feedback_onset = onset;
        feedback_duration = trial.robot_duration + trial.feedback_duration;
        onset += feedback_duration;
        show_fixation();
        // end_trial();
      }, trial.robot_duration + trial.feedback_duration);

    }

    var end_trial = function() {
      trial_offset_date_now = Date.now();

      // gather the data to store for the trial
      var trial_data = {
        "symbol_L": trial.symbol_L,
        "symbol_R": trial.symbol_R,
        "outcome_L": trial.outcome_L,
        "outcome_R": trial.outcome_R,
        "correct": trial.correct,
        "choice": response.key,
        "rt": response.rt,
        "accuracy": ((trial.correct == response.key) ? 1 : 0),
        "trial_onset": trial_onset,
        "choice_indication_onset": choice_indication_onset,
        "feedback_onset": feedback_onset,
        "fixation_onset": fixation_onset,
        "trial_duration": trial_duration,
        "choice_indication_duration": choice_indication_duration,
        "feedback_duration": feedback_duration,
        "fixation_duration": fixation_duration,
        "jitter": jitter,
        "time_of_response_date_now": time_of_response_date_now,
        "choice_indication_onset_date_now": choice_indication_onset_date_now,
        "choice_indication_offset_date_now": choice_indication_offset_date_now,
        "feedback_onset_date_now": feedback_onset_date_now,
        "feedback_offset_date_now": feedback_offset_date_now,
        "trial_onset_date_now": trial_onset_date_now,
        "trial_offset_date_now": trial_offset_date_now,
        "fixation_onset_date_now": fixation_onset_date_now,
        "fixation_offset_date_now": fixation_offset_date_now,
      };

      // clear the display
      display_element.innerHTML = '';

      // move on to the next trial
      jsPsych.finishTrial(trial_data);

    };

    // start the response listener
    if (trial.choices != jsPsych.NO_KEYS) {
      var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
        callback_function: after_response,
        valid_responses: trial.choices,
        rt_method: 'performance',
        persist: false,
        allow_held_key: false
      });
    }

    // end trial if choice_duration is set
    if (trial.choice_duration !== null) {
      jsPsych.pluginAPI.setTimeout(function() {
        choice_indication_offset_date_now = null;

        trial_onset = onset;
        trial_duration = trial.choice_duration;
        onset += trial_duration;

        choice_indication_onset = null;
        choice_indication_duration = null;
        missed_response();
      }, trial.choice_duration);
    }

  };

  return plugin;
})();

