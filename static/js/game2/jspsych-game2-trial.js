/**
 * jspsych-pit-instructions
 * Sam Zorowitz
 *
 * plugin for running one trial of the robot factory PIT task
 *
 **/

jsPsych.plugins["pit-trial"] = (function() {

  var plugin = {};

  plugin.info = {
    name: 'pit-trial',
    description: '',
    parameters: {
      robot_rune: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: 'Robot rune',
        description: 'Filename of rune image in static folder.'
      },
      scanner_color: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: 'Scanner color',
        description: 'Color of scanner light.'
      },
      outcome_correct: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: 'Outcome correct',
        default: '+10',
        description: 'Outcome to present on correct action.',
      },
      outcome_incorrect: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: 'Outcome incorrect',
        default: '-10',
        description: 'Outcome to present on incorrect action.',
      },
      outcome_color: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: 'Outcome color',
        description: 'Color of outcome text.'
      },
      correct: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        pretty_name: 'Correct response',
        description: 'Correct response for trial.'
      },
      rune_set: {
        type: jsPsych.plugins.parameterType.HTML_STRING,
        pretty_name: 'Rune font',
        default: 'elianto',
        description: 'Rune font style [elianto, bacs1, bacs2].'
      }, // Jen added rune_set
      valid_responses: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        array: true,
        pretty_name: 'Choices',
        default: [jsPsych.pluginAPI.convertKeyCharacterToKeyCode('space')],
        description: 'The keys the subject is allowed to press to respond to the stimulus.'
      },
      animation_duration: { // I changed this to be the fixation duration period of 500 ms
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Animation duration',
        default: 500,
        description: 'How long before keyboard listener should start.'
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: 2000, // NOTE, this is only the default, it is overwritten in pit-experiment.js
        description: 'How long to show trial before it ends.'
      },
      feedback_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Feedback duration',
        default: 500, // NOTE, this is only the default, it is overwritten in pit-experiment.js
        description: 'How long to show feedback before it ends.'
      },
    }
  }

  plugin.trial = function(display_element, trial) {

    // retrieve jitter for this trial
    jitter = random_pit_jitter();

    //---------------------------------------//
    // Define HTML.
    //---------------------------------------//

    // Initialize HTML.
    var new_html = '';

    // Insert CSS (window animation).
    new_html += `<style>
    body {
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
      position: fixed;
      background: -webkit-gradient(linear, left bottom, left top, from(#808080), color-stop(50%, #606060), color-stop(50%, rgba(28, 25, 23, 0.5)), to(rgba(179, 230, 230, 0.5)));
      background: linear-gradient(0deg, #808080 0%, #606060 50%, #A0A0A0 50%, #D3D3D3 100%);
    }
    .jspsych-content-wrapper {
      overflow: hidden;
    }
    @-webkit-keyframes pavlovian {
      0%    {border-bottom-color: rgba(0, 0, 0, 0);}
      90%   {border-bottom-color: rgba(0, 0, 0, 0);}
      100%  {border-bottom-color: ${trial.scanner_color};}
    }
    @keyframes pavlovian {
      0%    {border-bottom-color: rgba(0, 0, 0, 0);}
      90%   {border-bottom-color: rgba(0, 0, 0, 0);}
      100%  {border-bottom-color: ${trial.scanner_color};}
    }
     </style>`;

    // Add robot factor wrapper.
    new_html += '<div class="factory-wrap">';

    // Add factory machine parts (back).
    new_html += '<div class="machine-back"></div>';
    new_html += '<div class="shadows"></div>';
    
     // Add robot 1 (active).
    new_html += '<div class="robot">';
    new_html += '<div class="antenna"></div>';
    new_html += '<div class="head"></div>';
    new_html += '<div class="torso">';
    new_html += '<div class="left"></div>';
    new_html += '<div class="right"></div>';
    new_html += `<div class="rune" set="${trial.rune_set}" id="rune"><p></p></div></div>`;
    new_html += '<div class="foot"></div></div>';

    // Add factory machine parts (front).
    new_html += '<div class="machine-front">';
    new_html += '<div class="score-container">';
    new_html += '<div class="score" id="outcome"></div>';
    new_html += '</div></div>';
    new_html += '<div class="machine-top"></div>';

    // Close wrapper.
    new_html += '</div>';

    // Display HTML
    display_element.innerHTML = new_html;

    var trial_onset_date_now        = Date.now();
    var robot_onset_date_now        = Date.now();
    var stim_onset_date_now         = null;
    var time_of_response_date_now   = null;
    var outcome_onset_date_now      = null;
    var outcome_offset_date_now     = null;
    var fixation_onset_date_now     = null;
    var fixation_offset_date_now    = null;
    var trial_offset_date_now       = null;

    //---------------------------------------//
    // Response handling.
    //---------------------------------------//

    // Initialize response
    var all_responses = [];
    var response = {
      rt: -1,
      key: -1
    };

    // Record any response
    var any_response = function(info) {
      all_responses.push(info.rt);
    }

    // Feedback phase
    var after_response = function(info) {
        console.log("after response");
      // Kill any timeout handlers / keyboard listeners
      jsPsych.pluginAPI.clearAllTimeouts();
      jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);

      // Record response (if any made)
      if (info != null) {
        time_of_response_date_now = Date.now();
        response = info;
        // Display go signal
        document.getElementById("rune").setAttribute('status', 'go');
      }

      // Define accuracy
      if (trial.correct == response.key) {
        response.accuracy = 1;
      } else {
        response.accuracy = 0;
      };

      // Define outcome
      if (response.accuracy == 1) {
        trial.outcome = trial.outcome_correct;
      } else {
        trial.outcome = trial.outcome_incorrect;
      }

      // ensure the stimulus is presented for a fixed amount of time, regardless of response
      if (info != null) { // if responded
          jsPsych.pluginAPI.setTimeout(function() {
            present_outcome();
          }, trial.trial_duration - response.rt);
      } else { // if didn't respond
        present_outcome();
      }
    };

    var present_outcome = function() {
      // Present outcome
      document.getElementById("outcome").innerHTML = trial.outcome;
      if (trial.outcome == "+1" || trial.outcome == "-1") {
        document.getElementById("outcome").style['color'] = 'black';
      } else {
        document.getElementById("outcome").style['color'] = trial.outcome_color;
      }

      outcome_onset_date_now = Date.now();

      jsPsych.pluginAPI.setTimeout(function() {
        outcome_offset_date_now = Date.now();
        outcome_onset = onset;
        outcome_duration = trial.feedback_duration;
        onset += outcome_duration;
        show_fixation();
      }, trial.feedback_duration);
    }

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
          background: -webkit-gradient(linear, left bottom, left top, from(#808080), color-stop(50%, #606060), color-stop(50%, rgba(28, 25, 23, 0.5)), to(rgba(179, 230, 230, 0.5)));
          background: linear-gradient(0deg, #808080 0%, #606060 50%, #A0A0A0 50%, #D3D3D3 100%);
        }
        .jspsych-content-wrapper {
          overflow: hidden;
        }
        @-webkit-keyframes pavlovian {
          0%    {border-bottom-color: rgba(0, 0, 0, 0);}
          90%   {border-bottom-color: rgba(0, 0, 0, 0);}
          100%  {border-bottom-color: ${trial.scanner_color};}
        }
        @keyframes pavlovian {
          0%    {border-bottom-color: rgba(0, 0, 0, 0);}
          90%   {border-bottom-color: rgba(0, 0, 0, 0);}
          100%  {border-bottom-color: ${trial.scanner_color};}
        }
         </style>`;

        // Add robot factor wrapper.
        new_html += '<div class="factory-wrap">';

        // Add factory machine parts (back).
        new_html += '<div class="machine-back"></div>';
        new_html += '<div class="shadows"></div>';

        // Add factory machine parts (front).
        new_html += '<div class="machine-front">';
        new_html += '<div class="score-container">';
        new_html += '<div class="score" id="outcome"></div>';
        new_html += '</div></div>';
        new_html += '<div class="machine-top"></div>';

        // Draw fixation
        new_html += '<div style="font-size:80px;position: absolute;top: 45%;left:50%;transform: translateX(-22px);text-align: center;">+</div>';
        // new_html += '<center><p style="font-size:80px;position: absolute;top: 45%">+</p></center>';

        // Close wrapper.
        new_html += '</div>';

      display_element.innerHTML = new_html;

      jsPsych.pluginAPI.setTimeout(function() {
        fixation_offset_date_now = Date.now();
        fixation_onset = onset;
        fixation_duration = trial.animation_duration;
        onset += fixation_duration;
        // move on to the next trial
        display_element.innerHTML = orig_html;
        end_trial();
      }, trial.animation_duration);
    }

    // End trial
    var end_trial = function() {
      trial_offset_date_now = Date.now();

      // Kill any timeout handlers / keyboard listeners
      jsPsych.pluginAPI.clearAllTimeouts();
      jsPsych.pluginAPI.cancelKeyboardResponse(keyboardSuperListener);
      if (typeof keyboardListener !== 'undefined') {
        jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
      }

      // Store data
      var trial_data = {
        "Rune": trial.robot_rune,
        "Correct": trial.correct,
        "Choice": response.key,
        "RT": response.rt,
        "Accuracy": response.accuracy,
        "Outcome": trial.outcome,
        "Keys": all_responses,
        "TotalKeys": all_responses.length,
        "robot_onset": robot_onset,
        "stim_onset": stim_onset,
        "outcome_onset": outcome_onset,
        "fixation_onset": fixation_onset,
        "robot_duration": robot_duration,
        "stim_duration": stim_duration,
        "outcome_duration": outcome_duration,
        "fixation_duration": fixation_duration,
        "jitter": jitter,
        "robot_onset_date_now": robot_onset_date_now,
        "stim_onset_date_now": stim_onset_date_now,
        "time_of_response_date_now": time_of_response_date_now,
        "outcome_onset_date_now": outcome_onset_date_now,
        "outcome_offset_date_now": outcome_offset_date_now,
        "fixation_onset_date_now": fixation_onset_date_now,
        "fixation_offset_date_now": fixation_offset_date_now,
        "trial_onset_date_now": trial_onset_date_now,
        "trial_offset_date_now": trial_offset_date_now,
      };

      // Clear the display
      display_element.innerHTML = '';

      // End trial
      jsPsych.finishTrial(trial_data);

    };

    var show_stim = function() {
        stim_onset_date_now = Date.now();

        stim_onset = onset;
        stim_duration = trial.trial_duration;
        onset += stim_duration;

        // Initialize HTML.
        var new_html = '';

        // Insert CSS (window animation).
        new_html += `<style>
        body {
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
          position: fixed;
          background: -webkit-gradient(linear, left bottom, left top, from(#808080), color-stop(50%, #606060), color-stop(50%, rgba(28, 25, 23, 0.5)), to(rgba(179, 230, 230, 0.5)));
          background: linear-gradient(0deg, #808080 0%, #606060 50%, #A0A0A0 50%, #D3D3D3 100%);
        }
        .jspsych-content-wrapper {
          overflow: hidden;
        }
        @-webkit-keyframes pavlovian {
          0%    {border-bottom-color: rgba(0, 0, 0, 0);}
          90%   {border-bottom-color: rgba(0, 0, 0, 0);}
          100%  {border-bottom-color: ${trial.scanner_color};}
        }
        @keyframes pavlovian {
          0%    {border-bottom-color: rgba(0, 0, 0, 0);}
          90%   {border-bottom-color: rgba(0, 0, 0, 0);}
          100%  {border-bottom-color: ${trial.scanner_color};}
        }
         </style>`;

        // Add robot factor wrapper.
        new_html += '<div class="factory-wrap">';

        // Add factory machine parts (back).
        new_html += '<div class="machine-back"></div>';
        new_html += '<div class="shadows"></div>';

        // Add robot 1 (active).
        new_html += '<div class="robot">';
        new_html += '<div class="antenna"></div>';
        new_html += '<div class="head"></div>';
        new_html += '<div class="torso">';
        new_html += '<div class="left"></div>';
        new_html += '<div class="right"></div>';
        new_html += `<div class="rune" set="${trial.rune_set}" id="rune"><p>${trial.robot_rune}</p></div></div>`;
        new_html += '<div class="foot"></div></div>';

        // Add factory window.
        new_html += `<div class="scanner-light" style="border-bottom-color: ${trial.scanner_color}"></div>`;

        // Add factory machine parts (front).
        new_html += '<div class="machine-front">';
        new_html += '<div class="score-container">';
        new_html += '<div class="score" id="outcome"></div>';
        new_html += '</div></div>';
        new_html += '<div class="machine-top"></div>';

        // Close wrapper.
        new_html += '</div>';

        // Display HTML
        display_element.innerHTML = new_html;
    }

    // Start the response listener
    if (trial.valid_responses != jsPsych.NO_KEYS) {

      // Task keyboardListener
      var keyboardListener = "";

      // this variables are set at the beginning of the trial
      robot_onset = onset;
      robot_duration = jitter;
      onset += robot_duration;
      setTimeout(function() {
        show_stim();
        keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
          callback_function: after_response,
          valid_responses: trial.valid_responses,
          rt_method: 'performance',
          persist: false,
          allow_held_key: false
        });
      }, jitter);

      // Universal keyboardListener
      var keyboardSuperListener = jsPsych.pluginAPI.getKeyboardResponse({
          callback_function: any_response,
          valid_responses: trial.valid_responses,
          rt_method: 'performance',
          persist: true,
          allow_held_key: false
        });

    }

    // End trial if trial_duration is set
    if (trial.trial_duration !== null) {
      jsPsych.pluginAPI.setTimeout(function() { // triggered if did not respond
        after_response();
      }, jitter + trial.trial_duration);
    }

  };

  return plugin;
})();
