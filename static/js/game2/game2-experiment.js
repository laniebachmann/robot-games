// Get jitter for trial in PIT task
function random_pit_jitter() {
    // Flat 1s ITI (Zorowitz et al. 2025 Exp. 2) -- was jittered via isi_pit.csv for fMRI deconvolution.
    return 1000;
}

//------------------------------------//
// Define parameters.
//------------------------------------//

// Define trial structure.
runsheets = jsPsych.randomization.shuffle(runsheets)

// Define rune sets.
const rune_sets = ['elianto','bacs1','bacs2'];
const rune_prob = [0.33,0.33,0.33];

// Define aesthetics.
if ( Math.random() < 1 ) {
  var instr_color_win    = 'blue';
  var scanner_color_win  = '#3366ff99';
  var outcome_color_win  = '#1a3ea7';
  var instr_color_lose   = 'red';
  var scanner_color_lose = '#f73b6a7A';
  var outcome_color_lose = '#930a25';
} else {
  var instr_color_win    = 'red';
  var scanner_color_win  = '#f73b6a7A';
  var outcome_color_win  = '#930a25';
  var instr_color_lose   = 'blue';
  var scanner_color_lose = '#3366ff99';
  var outcome_color_lose = '#1a3ea7';
}

// Define go key.
const key_go = jsPsych.pluginAPI.convertKeyCharacterToKeyCode('space');

// Define timings.
const trial_duration = 1300;         // Duration of trial (response phase) -- Zorowitz et al. 2025 Exp. 2
const feedback_duration = 1200;      // Duration of feedback (minimum) -- Zorowitz et al. 2025 Exp. 2

//------------------------------------//
// Define rune order.
//------------------------------------//

// Randomly select rune set.
const rune_set = jsPsych.randomization.sampleWithReplacement(rune_sets, 1, rune_prob)[0];

// Gather rune orders.
if ( rune_set == 'elianto' ) {
  var runes_a = ['U', 'L', 'A', 'G', 'P', 'S', 'W', 'E', 'K', 'D', 'J', 'V'];
  var runes_b = ['M', 'R', 'Y', 'H', 'Z', 'C', 'B', 'T', 'X', 'F', 'N', 'Q'];
} else if ( rune_set == 'bacs1' ) {
  var runes_a = ['B', 'Z', 'J', 'R', 'V', 'E', 'T', 'F', 'A', 'C', 'L', 'Q'];
  var runes_b = ['Y', 'H', 'P', 'M', 'U', 'S', 'K', 'D', 'O', 'I', 'G', 'N'];
} else if ( rune_set == 'bacs2' ) {
  var runes_a = ['J', 'W', 'X', 'Z', 'G', 'O', 'C', 'E', 'H', 'Q', 'T', 'Y'];
  var runes_b = ['M', 'B', 'K', 'V', 'R', 'P', 'L', 'S', 'U', 'A', 'F', 'N'];
}

// Randomize presentation order.
if ( Math.random() < 0.5 ) { runes_a = runes_a.reverse(); }
if ( Math.random() < 0.5 ) { runes_b = runes_b.reverse(); }
var runes = ( Math.random() < 0.5 ) ? [runes_a, runes_b] : [runes_b, runes_a];


// Define comprehension threshold.
var max_errors = 0;
var max_loops = 2;
var num_loops = 0;

// Define accuracy threshold.
const threshold = 0.90;              // response-variability check (existing)
const go_to_win_threshold = 0.55;    // Zorowitz et al. 2025 Exp. 2: exclude if accuracy on go-to-win trials falls below this

// Initialize onset and duration times
var onset                           = 0;

// For the learning phase
var robot_onset                     = 0;
var stim_onset                      = 0;
var outcome_onset                   = 0;
var fixation_onset                  = 0;

var robot_duration                  = 0;
var stim_duration                   = 0;
var outcome_duration                = 0;
var fixation_duration               = 0;

var jitter;

//------------------------------------//
// Define images for preloading.
//------------------------------------//

// var rune_stimuli = ['../static/img/rune_00_ingz.png', '../static/img/rune_00_isaz.png'];
// [].concat.apply([],runes).forEach(function(rune) {
//   rune_stimuli.push('../static/img/' + rune + '.png')
// })

//------------------------------------//
// Define instructions.
//------------------------------------//

var instructions_01 = {
  type: 'pit-instructions',
  pages: [
    "Welcome to the <b>Robot Factory</b> game!",
    "In this game, you will be inspecting robots as they come into the <b>factory scanner</b>.",
    "Sometimes a robot in the factory will need repair.<br>How often a robot will need repair <b>depends on its type.</b>",
    "There are many different types of robots. Each type of robot<br>can be identified by the <b>unique symbol</b> on its chestplate.",
    "When a robot enters the scanner, you must decide whether to:<br><b>Repair</b> the robot (press SPACE) <br><b>Ignore</b> the robot (do nothing)",
    "You will earn the most points by fixing robots that need repair and ignoring robots that do not.",
    `Importantly, how many points you can win or lose depends<br>on whether the robot is <b><font color=${outcome_color_win}>SAFE</font></b> or <b><font color=${outcome_color_lose}>DANGEROUS</font></b>.`,
    `If the scanner is <b><font color=${outcome_color_win}>${instr_color_win}</font></b>, the robot is <b><font color=${outcome_color_win}>SAFE</font></b>.<br>You will earn +10 points for correctly repairing or ignoring<br>a safe robot. You will earn only +1 point for incorrect actions.`,
    "Now let's practice with a safe robot. Try to learn if<br>you should repair (press SPACE) or ignore it (do nothing).<br><b>Remember:</b> you will earn +10 points for the correct action.",
    "<b>HINT:</b> Only press once the robot is in the scanner<br>and the scanner light comes on."
  ],
  robot_runes: [
    '', '', '', 'O', '', '', '', '', ''
  ],
  scanner_colors: [
    '#FFFFFF00', '#FFFFFF00', '#FFFFFF00', '#FFFFF080', '#FFFFFF00', '#FFFFFF00',
    '#FFFFFF00', scanner_color_win, scanner_color_win, scanner_color_win
  ],
  show_clickable_nav: true,
  button_label_previous: "Prev",
  button_label_next: "Next",
  on_start: function(trial) {
    pass_message_pit('starting instructions');
  }
}

var instructions_02 = {
  type: 'pit-instructions',
  pages: [
    "Now let's practice for another type of safe robot.<br>Try to learn if you should repair this robot (press SPACE)<br>or ignore it (do nothing).",
    "<b>Remember:</b> not every robot will need repair, and<br>you will earn +10 points for the correct action."
  ],
  show_clickable_nav: true,
  button_label_previous: "Prev",
  button_label_next: "Next"
}

var instructions_03 = {
  type: 'pit-instructions',
  pages: [
    `If the scanner is <b><font color=${outcome_color_lose}>${instr_color_lose}</font></b>, the robot is <b><font color=${outcome_color_lose}>DANGEROUS</font></b>.<br>You will lose only -1 point for correctly repairing or ignoring<br>a dangerous robot. You will lose -10 points for incorrect actions.`,
    "Now let's practice for a dangerous robot. Try to learn if<br>you should repair it (press SPACE) or ignore it (do nothing).<br><b>Remember:</b> you will lose only -1 points for the correct action.",
  ],
  show_clickable_nav: true,
  button_label_previous: "Prev",
  button_label_next: "Next",
}

var instructions_04 = {
  type: 'pit-instructions',
  pages: [
    "Now let's practice for another type of dangerous robot.<br>Try to learn if you should repair this robot (press SPACE)<br>or ignore it (do nothing).",
    "<b>Remember:</b> some dangerous robots need repair, and<br>you will lose only -1 points for the correct action."
  ],
  show_clickable_nav: true,
  button_label_previous: "Prev",
  button_label_next: "Next",
}

var instructions_05 = {
  type: 'pit-instructions',
  pages: [
    "Great job! We're almost ready to begin the game.",
    "<b>Remember:</b> Not all robots of the same type will need repair, but<br>some types of robots will need repair more often than others.",
    "Pay close attention to the robot's symbol as it will help you<br>decide whether to repair the robot (press SPACE)<br>or ignore the robot (do nothing).",
    "Try to earn, and avoid losing, as many points as you can.",
    "At the end of the game, the total number of points you've<br>earned will be converted into a <b>performance bonus.</b>",
    "Next, we will ask you some questions about the game."
  ]
}

//------------------------------------//
// Define experiment.
//------------------------------------//
// One block of the PIT task is comprised of 8-12 exposures to 12 robots, or
// 120 total trials. 80% of trials provide correct feedback. There are 2 total
// blocks, or 240 total trials.

// Iteratively define trials (2 blocks, 20 exposures per robot).
var PIT = [];
var n = 0;

for (let i=0; i<runsheets.length; i++) {

  for (let j=0; j<runsheets[i]['robots'].length; j++) {

    jsPsych.randomization.shuffle([0,1,2,3]).forEach(function (k) {
      // Extract trial information.
      const robot    = runsheets[i]['robots'][j][k];
      const stimulus = runsheets[i]['stimuli'][j][k];

      // Define trial metadata.
      const valence = (robot < 2) ? 'win' : 'lose';
      const action = (robot % 2 == 0) ? 'go' : 'no-go';

      // Define trial outcomes.
      const sham = (Math.random() < 0.8) ? 0 : 1;
      if (valence == 'win' && sham == 0) {
        var outcome_correct   = '+10';
        var outcome_incorrect = '+1';
      } else if (valence == 'win') {
        var outcome_correct   = '+1';
        var outcome_incorrect = '+10';
      } else if (valence == 'lose' && sham == 0) {
        var outcome_correct   = '-1';
        var outcome_incorrect = '-10';
      } else {
        var outcome_correct   = '-10';
        var outcome_incorrect = '-1';
      }
      
      // Define trial.
      const trial = {
        type: 'pit-trial',
        robot_rune: runes[i][stimulus],
        scanner_color: valence == 'win' ? scanner_color_win : scanner_color_lose,
        outcome_color: valence == 'win' ? outcome_color_win : outcome_color_lose,
        outcome_correct: outcome_correct,
        outcome_incorrect: outcome_incorrect,
        correct: robot % 2 == 0 ? key_go : -1,
        rune_set: rune_set,
        valid_responses: [key_go],
        trial_duration: trial_duration,
        feedback_duration: feedback_duration,
        data: {
          block: i + 1,
          trial: n + 1,
          stimulus: stimulus,
          robot: robot + 1,
          valence: valence,
          action: action,
          sham: sham,
          rune_set: rune_set      // symbol font for this participant (elianto / bacs1 / bacs2)
        },
    	};

      // Append.
      PIT.push(trial)
      n++;

    })

  }

}

// for (var b=0; b<2; b++) {
// 
//   for (var i=0; i<20; i++) {
// 
//     // Define presentation order of 4 robots.
//     const order = jsPsych.randomization.repeat([0,1,2,3],1);
// 
//     // Iteratively define and append PIT trials.
//     order.forEach(function (robot) {
// 
//       // Predefine valence.
//       const valence = Math.floor(robot / 2) == 0 ? 'Win' : 'Lose';
// 
//       // Predefine sham.
//       const sham = Math.random() < 0.2 ? 1 : 0;
// 
//       // Predefine feedback.
//       if (valence == 'Win' && sham == 0) {
//         var outcome_correct   = '+10';
//         var outcome_incorrect = '+1';
//       } else if (valence == 'Win' && sham == 1) {
//         var outcome_correct   = '+1';
//         var outcome_incorrect = '+10';
//       } else if (valence == 'Lose' && sham == 0) {
//         var outcome_correct   = '-1';
//         var outcome_incorrect = '-10';
//       } else if (valence == 'Lose' && sham == 1) {
//         var outcome_correct   = '-10';
//         var outcome_incorrect = '-1';
//       }
// 
//       const trial = {
//         type: 'pit-trial',
//         robot_rune: runes[b][robot],
//         outcome_color: valence == 'Win' ? outcome_color_win : outcome_color_lose,
//         outcome_correct: outcome_correct,
//         outcome_incorrect: outcome_incorrect,
//         correct: robot % 2 == 0 ? key_go : -1,
//         valid_responses: [key_go],
//         trial_duration: trial_duration,
//         feedback_duration: feedback_duration,
//         data: {
//           Block: b + 1,
//           Trial: n + 1,
//           Robot: robot + 1,
//           Valence: valence,
//           Action: robot % 2 == 0 ? 'Go' : 'No-Go',
//           Sham: sham,
//           Color: valence == 'Win' ? instr_color_win : instr_color_lose,
//         }
//       };
// 
//       PIT.push(trial)
//       n = n + 1;
// 
//     })
// 
//   }
// 
// }

//------------------------------------//
// Define quality check
//------------------------------------//
// Check PIT accuracy after first block. Reject participants
// who respond consistently (go or no-go) on 90% or more trials.

var accuracy_check = function() {

  // Compute metadata.
  // NOTE: field is lowercase 'block' (set in the trial's data object below), not 'Block' -- the original
  // filter here used 'Block' and so always matched zero trials; fixed as part of wiring up this check.
  var choices = jsPsych.data.get().filter({block: 1}).select('Choice');
  const freqs = choices.frequencies();
  const denom = choices.count();

  // Check if Go or No-Go responses comprise more than 90% of responses (non-differentiation / non-engagement).
  var variability_flag = false;
  if ( ((freqs[key_go] || 0) / denom) > threshold ) {
    variability_flag = true;
  } else if ( ((freqs[-1] || 0) / denom) > threshold ) {
    variability_flag = true;
  }

  // Zorowitz et al. 2025 Exp. 2: flag if accuracy on go-to-win trials (Block 1) falls below 55%.
  var go_to_win_trials = jsPsych.data.get().filter({block: 1, valence: 'win', action: 'go'});
  const go_to_win_accuracy = go_to_win_trials.count() > 0
    ? go_to_win_trials.select('Accuracy').mean()
    : null;
  const go_to_win_flag = (go_to_win_accuracy !== null) && (go_to_win_accuracy < go_to_win_threshold);

  var low_quality = variability_flag || go_to_win_flag;

  return {
    low_quality: low_quality,
    variability_flag: variability_flag,
    go_to_win_accuracy: go_to_win_accuracy,
    go_to_win_flag: go_to_win_flag
  };
}

var ACCURACY_CHECK = {
  type: 'call-function',
  func: accuracy_check,
  on_finish: function(trial) {
    // Result (low_quality / variability_flag / go_to_win_accuracy / go_to_win_flag) is recorded
    // in this trial's data for offline review. Not wired to auto-exclude -- see note to Lanie.
    var result = jsPsych.data.getLastTrialData().values()[0].value;
    low_quality = result.low_quality;
    // if (low_quality) {
    //     jsPsych.endExperiment();
    // }
  }
}

//------------------------------------//
// Define transition screens.
//------------------------------------//

// Define ready screen.
var READY_01 = {
  type: 'pit-instructions',
  pages: [
    "Great job! You've passed the comprehension check.",
    "Get ready to begin <b>Block 1 of 2</b>.<br>Click 'Next' when you're ready to start.",
  ],
  show_clickable_nav: true,
  button_label_previous: "Prev",
  button_label_next: "Next",
  on_finish: function(trial) {
    pass_message_pit('starting block 1');
  }
}

var READY_02 = {
  type: 'pit-instructions',
  pages: [
    "Take a break for a few moments and click 'Next' when you are ready to continue.",
    "In this next block, you will judge <b>brand new robots</b>.",
    "Get ready to begin <b>Block 2 of 2</b>.<br>Click 'Next' when you're ready to start.",
  ],
  show_clickable_nav: true,
  button_label_previous: "Prev",
  button_label_next: "Next",
  on_finish: function(trial) {
    pass_message_pit('starting block 2');
  }
}

// Define finish screen.
var FINISHED = {
  type: 'pit-instructions',
  pages: [
    "Great job! You've finished both games.",
  ],
  show_clickable_nav: true,
  button_label_previous: "Prev",
  button_label_next: "Next",
}
