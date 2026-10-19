
function random_jitter() {
    // Constant 0.5s ITI (was a random 0-4000ms jitter; scanner-jitter no longer used online).
    return 500;
}


// ITI for trials in learning phase: constant 0.5s (was jittered via isi_palm.csv for fMRI deconvolution).
function random_learning_jitter() {
    return 500;
}

// ITI for trials in probe phase: constant 0.5s (was jittered via isi_prob.csv for fMRI deconvolution).
function random_probe_jitter() {
    return 500;
}


//---------------------------------------//
// Define symbol assignment.
//---------------------------------------//

// Define unique symbols.
var symbol_array = ['c','d','e','f','j','k','m','o','s','t','y','C','N','O','L','T']

// Shuffle symbols.
symbol_array = jsPsych.randomization.repeat(symbol_array, 1);

// Define comprehension threshold.
var max_errors = 0;
var max_loops = 2;
var num_loops = 0;

// Define missed repsonses count.
var missed_threshold = 10;
var missed_responses = 0;

// Set response keys
var response_keys = ['leftarrow','rightarrow'];
var response_key_codes = [jsPsych.pluginAPI.convertKeyCharacterToKeyCode(response_keys[0]),jsPsych.pluginAPI.convertKeyCharacterToKeyCode(response_keys[1])];

//---------------------------------------//
// Probe scoring (recorded only; no feedback is shown).
//---------------------------------------//
// Designed expected value of each symbol, by its index in symbol_array.
// Learning pairs are (0,1),(2,3),...,(14,15). Even pair number = gain pair, odd = loss pair.
// The first symbol of each pair gives the outcome on 75% of trials, the second on 25%.
//   gain pair: +7.5 vs +2.5      loss pair: -7.5 vs -2.5
function symbol_ev(idx) {
  var sign = (Math.floor(idx / 2) % 2 == 0) ? 1 : -1;
  var p    = (idx % 2 == 0) ? 0.75 : 0.25;
  return sign * p * 10;
}

// Trial data for a probe pairing: each symbol's EV and the higher-EV ("correct") key.
// Equal-EV pairings (same symbol type from different learning pairs) have no correct answer: null.
// Fixed outcome counts (this version only).
// Each symbol appears 24 times per learning block (12 x left/right). Instead of drawing each
// outcome independently, every symbol gets a shuffled deck: 75% symbols give their outcome on
// exactly 18 of 24 appearances, 25% symbols on exactly 6. Decks are separate per symbol, so the
// left and right outcomes on a trial stay independent of each other (as in Palminteri et al. 2015).
var OUTCOME_DECKS = [];
for (var d = 0; d < 16; d++) {
  var hits = (d % 2 == 0) ? 18 : 6;
  var deck = [];
  for (var h = 0; h < 24; h++) { deck.push(h < hits); }
  OUTCOME_DECKS.push(jsPsych.randomization.shuffle(deck));
}
function draw_outcome(idx, val) {
  return OUTCOME_DECKS[idx].pop() ? val : 'zero';
}

// Shorthand for what a symbol does when chosen:
//   G75 = +10 on 75% of trials (else 0)    G25 = +10 on 25% (else 0)
//   L75 = -10 on 75% of trials (else 0)    L25 = -10 on 25% (else 0)
function symbol_cond(idx) {
  var context = (Math.floor(idx / 2) % 2 == 0) ? 'G' : 'L';
  var p       = (idx % 2 == 0) ? '75' : '25';
  return context + p;
}

// Trial data for a learning pair: condition label and EV of the symbol on each side.
function learning_data(iL, iR, block) {
  return {
    block: block,
    cond_L: symbol_cond(iL),
    cond_R: symbol_cond(iR),
    ev_L: symbol_ev(iL),
    ev_R: symbol_ev(iR),
  };
}

// Record which condition was chosen on a learning trial (choice = key code).
function label_learning_choice(data) {
  if (data.choice == null || data.choice == -1) { data.choice_cond = null; return; }
  data.choice_cond = (data.choice == response_key_codes[0]) ? data.cond_L : data.cond_R;
}

function probe_data(i, j, block) {
  var evL = symbol_ev(i), evR = symbol_ev(j);
  return {
    block: block,
    cond_L: symbol_cond(i),
    cond_R: symbol_cond(j),
    ev_L: evL,
    ev_R: evR,
    correct: (evL > evR) ? response_key_codes[0] : ((evR > evL) ? response_key_codes[1] : null),
  };
}

// Record the choice (and accuracy where defined) after each probe trial.
function score_probe(data) {
  if (data.key_press == null || data.key_press == -1) {
    data.choice = null; data.choice_side = null; data.choice_symbol = null; data.choice_cond = null; data.accuracy = null;
    return;
  }
  var left = (data.key_press == response_key_codes[0]);
  data.choice        = data.key_press;                       // key code, same as learning trials
  data.choice_side   = left ? 'left' : 'right';
  data.choice_symbol = left ? data.symbol_L : data.symbol_R;
  data.choice_cond   = left ? data.cond_L : data.cond_R;
  data.accuracy      = (data.correct == null) ? null : ((data.key_press == data.correct) ? 1 : 0);
}

// Initialize onset and duration times
var onset                           = 0;

// For the learning phase
var trial_onset                     = 0;
var choice_indication_onset         = 0;
var feedback_onset                  = 0;
var fixation_onset                  = 0;

var trial_duration                  = 0;
var choice_indication_duration      = 0;
var feedback_duration               = 0;
var fixation_duration               = 0;

var jitter;

//---------------------------------------//
// Define learning phase instructions.
//---------------------------------------//

var instructions_01 = {
  type: 'palminteri-instructions',
  pages: [
    "You will play two games with these robots. In the first game, you will choose your robot team. In the second game, you will repair robots." + AI_NOTE_HTML,
    "<b>Game 1: Choose your robot team.</b><br>You are a space explorer picking robots for your crew.",
    "Each robot has a <b>unique symbol</b> on its chest.<br>Use the symbols to tell the robots apart.",
    "On each turn, pick one of two robots using the <b>left/right arrow keys</b>.<br>The robot you pick may give you <b><font color=#01579b>+10</font></b>, <b><font color=#303030>0</font></b>, or <b><font color=#A41919>-10</font></b> points.",
    "You will also see what the other robot would have given you,<br>but you only earn points for the robot you pick.",
    "Some robots are better than others. Try to learn which ones,<br>and earn as many points as you can.",
    "<b>Let's practice!</b> Pick a robot with the left/right arrow keys<br>and try to learn which one gives more points."
  ],
  symbol_L: "V",
  symbol_R: "U",
  on_start: function(trial) {
    pass_message_pit('starting instructions');
  }
}

var practice_block_01 = {
  type: 'palminteri-practice',
  symbol_L: "V",
  symbol_R: "U",
  outcome_L: "zero",
  outcome_R: "win",
  choices: response_key_codes,
  correct: response_key_codes[1],
  feedback_duration: 2000
}

var instructions_02 = {
  type: 'palminteri-instructions',
  pages: [
    "<b>Practice:</b> one more pair of robots."
  ],
  symbol_L: "W",
  symbol_R: "R",
}

var practice_block_02 = {
  type: 'palminteri-practice',
  symbol_L: "W",
  symbol_R: "R",
  outcome_L: "lose",
  outcome_R: "zero",
  choices: response_key_codes,
  correct: response_key_codes[1],
  feedback_duration: 2000
}

var instructions_03 = {
  type: 'palminteri-instructions',
  pages: [
    "<b>That's the end of practice.</b> In the real game there will be many robots,<br>so pay close attention to their symbols.",
    "Your points will be turned into a performance bonus.<br>Next, you'll answer a few questions about the game.<br>You must get them all right to continue."
  ]
}

var comprehension = {
  type: 'palminteri-comprehension'
}

// First wrong attempt: a second try at the questions (no practice in between).
var comprehension_second_try = {
  timeline: [
    {
      type: 'palminteri-instructions',
      pages: ["Some of your answers were not correct.<br>Please try the questions again."],
      symbol_L: "V",
      symbol_R: "U",
    },
    comprehension
  ],
  conditional_function: function() {
    return jsPsych.data.get().last(1).values()[0].num_errors > max_errors;
  }
}

// Second wrong attempt: go back through the instructions and practice.
var comprehension_retry = {
  timeline: [{
    type: 'palminteri-instructions',
    pages: ["Some of your answers were not correct.<br>Let's go over the instructions again."],
    symbol_L: "V",
    symbol_R: "U",
  }],
  conditional_function: function() {
    return jsPsych.data.get().last(1).values()[0].num_errors > max_errors;
  }
}

var instructions = {
  timeline: [
    instructions_01,
    practice_block_01,
    instructions_02,
    practice_block_02,
    instructions_03,
    comprehension,
    comprehension_second_try,
    comprehension_retry
  ],
  loop_function: function(data) {
    // Repeat the instructions until every comprehension question is answered correctly.
    var comp = data.filter({trial_type: 'palminteri-comprehension'}).values();
    var num_errors = comp[comp.length - 1].num_errors;
    if (num_errors > max_errors) { num_loops++; return true; }
    return false;
  }
}

var comprehension_check = {
  type: 'call-function',
  func: function(){},
  on_finish: function(trial) {
    if (low_quality) {
        // jsPsych.endExperiment();
    }
  }
}

var ready = {
  type: 'palminteri-instructions',
  pages: [
    "Great job! You've passed the comprehension check.",
    "Get ready to begin <b>Block 1 of 2</b>."
  ],
  on_finish: function(trial) {
    pass_message_pit('starting task');
  }
}

//---------------------------------------//
// Define probe phase instructions.
//---------------------------------------//

var instructions_05 = {
  type: 'palminteri-instructions',
  pages: [
    "Next, choose which robots you want on your team.<br>You won't see points after each choice,<br>but they still count toward your bonus.",
    "Pick the robot you think is better each time.<br><br>Choose wisely!"
  ]
}

var instructions_06 = {
  type: 'palminteri-instructions',
  pages: [
    "Great job! Take a short break, then click Next.",
    "Get ready to begin <b>Block 2 of 2</b>.<br>Pay attention to the symbols and earn as many points as you can."
  ]
}

//---------------------------------------//
// Define learning phase 1.
//---------------------------------------//
// Learning blocks are comprised of
// 24 presentations of 4 unique stimulus
// pairs (96 total trials). With left/right
// side counterbalancing, this is 12
// presentations per unique pair / side.

// Initialize phase array.
var learning_phase_1 = [];

// Iteratively define trials
for (i = 0; i < 12; i++) {

  // Initialize (temporary) trial array.
  const trials = [];

  // Iterate over unique pairs.
  for (j = 0; j < 4; j++) {

    // Define metadata.
    if (j % 2 == 0) { var val = 'win'; }
    else { var val = 'lose'; }

    // Append trial (LR).
    var LR = {
      type: 'palminteri-learning',
      symbol_L: symbol_array[2*j+0],
      symbol_R: symbol_array[2*j+1],
      outcome_L: draw_outcome(2*j+0, val),
      outcome_R: draw_outcome(2*j+1, val),
      choices: response_key_codes,
      correct: ((val == 'win') ? response_key_codes[0] : response_key_codes[1]),
      data: learning_data(2*j+0, 2*j+1, 1),
      on_finish: function(data) {

        label_learning_choice(data);

        // Evaluate missing data
        if ( data.rt == null ) {

          // Set missing data to true.
          data.missing = true;

          // Increment counter. Check if experiment should end.
          missed_responses++;
          if (missed_responses >= missed_threshold) {
            low_quality = true;
            //jsPsych.endExperiment();
          }

        } else {

          // Set missing data to false.
          data.missing = false;

        }

      }

    }

    // Define looping node.
    const LR_node = {
      timeline: [LR],
      loop_function: function(data) {
        return false;
        // return data.values()[0].missing;
        // commented out because we don't want missed trials to be repeated in the scanner
      }
    }
    trials.push(LR_node);

    // Append trial (RL).
    var RL = {
      type: 'palminteri-learning',
      symbol_L: symbol_array[2*j+1],
      symbol_R: symbol_array[2*j+0],
      outcome_L: draw_outcome(2*j+1, val),
      outcome_R: draw_outcome(2*j+0, val),
      choices: response_key_codes,
      correct: ((val == 'win') ? response_key_codes[1] : response_key_codes[0]),
      data: learning_data(2*j+1, 2*j+0, 1),
      on_finish: function(data) {

        label_learning_choice(data);

        // Evaluate missing data
        if ( data.rt == null ) {

          // Set missing data to true.
          data.missing = true;

          // Increment counter. Check if experiment should end.
          missed_responses++;
          if (missed_responses >= missed_threshold) {
            low_quality = true;
            // jsPsych.endExperiment(); // COMMENTED OUT BY ALICE, SHOULD IGNORE FOR THE SCAN
          }

        } else {

          // Set missing data to false.
          data.missing = false;

        }

      }

    }

    // Define looping node.
    const RL_node = {
      timeline: [RL],
      loop_function: function(data) {
        return false;
        // return data.values()[0].missing;
        // commented out because we don't want missed trials to be repeated in the scanner
      }
    }
    trials.push(RL_node);
  }

  // Shuffle trials. Append.
  learning_phase_1 = learning_phase_1.concat( jsPsych.randomization.repeat(trials, 1) );
}

//------------------------------------//
// Define probe phase 1.
//------------------------------------//
// Probe phases are comprised of
// every possible pair combination
// (28 in total) presented 4 times
// (112 total trials).

// Initialize phase array.
probe_phase_1 = [];

// Iteratively define trials
for (i = 0; i < 8; i++) {

  for (j = 0; j < 8; j++) {

    if (i != j) {

      // Append trial.
      var probe = {
        type: 'palminteri-probe',
        symbol_L: symbol_array[i],
        symbol_R: symbol_array[j],
        choices: response_key_codes,
        data: probe_data(i, j, 1),
        on_finish: function(data) {

          // Record choice / accuracy for later analysis (not shown to participant).
          score_probe(data);

          // Evaluate missing data
          if ( data.rt == null ) {

            // Set missing data to true.
            data.missing = true;

            // Increment counter. Check if experiment should end.
            missed_responses++;
            if (missed_responses >= missed_threshold) {
              low_quality = true;
              // jsPsych.endExperiment();
            }

          } else {

            // Set missing data to false.
            data.missing = false;

          }

        }

      }

      // Define looping node.
      const probe_node = {
        timeline: [probe],
        loop_function: function(data) {
           return false;
          // return data.values()[0].missing;
          // commented out because we don't want missed trials to be repeated in the scanner
        }
      }


      // Add trials twice.
      probe_phase_1.push(probe_node);
      probe_phase_1.push(probe_node);
    }

  }

};

// Shuffle trials.
probe_phase_1 = jsPsych.randomization.repeat(probe_phase_1, 1);

//---------------------------------------//
// Define learning phase 2.
//---------------------------------------//
// Learning blocks are comprised of
// 24 presentations of 4 unique stimulus
// pairs (96 total trials). With left/right
// side counterbalancing, this is 12
// presentations per unique pair / side.

// Initialize phase array.
var learning_phase_2 = [];

// Iteratively define trials
for (i = 0; i < 12; i++) {

  // Initialize (temporary) trial array.
  const trials = [];

  // Iterate over unique pairs.
  for (j = 4; j < 8; j++) {

    // Define metadata.
    if (j % 2 == 0) { var val = 'win'; }
    else { var val = 'lose'; }

    // Append trial (LR).
    var LR = {
      type: 'palminteri-learning',
      symbol_L: symbol_array[2*j+0],
      symbol_R: symbol_array[2*j+1],
      outcome_L: draw_outcome(2*j+0, val),
      outcome_R: draw_outcome(2*j+1, val),
      choices: response_key_codes,
      correct: ((val == 'win') ? response_key_codes[0] : response_key_codes[1]),
      data: learning_data(2*j+0, 2*j+1, 2),
      on_finish: function(data) {

        label_learning_choice(data);

        // Evaluate missing data
        if ( data.rt == null ) {

          // Set missing data to true.
          data.missing = true;

          // Increment counter. Check if experiment should end.
          missed_responses++;
          if (missed_responses >= missed_threshold) {
            low_quality = true;
            // jsPsych.endExperiment();
          }

        } else {

          // Set missing data to false.
          data.missing = false;

        }

      }

    }

    // Define looping node.
    const LR_node = {
      timeline: [LR],
      loop_function: function(data) {
        return false;
        // return data.values()[0].missing;
        // commented out because we don't want missed trials to be repeated in the scanner
      }
    }
    trials.push(LR_node);

    // Append trial (RL).
    var RL = {
      type: 'palminteri-learning',
      symbol_L: symbol_array[2*j+1],
      symbol_R: symbol_array[2*j+0],
      outcome_L: draw_outcome(2*j+1, val),
      outcome_R: draw_outcome(2*j+0, val),
      choices: response_key_codes,
      correct: ((val == 'win') ? response_key_codes[1] : response_key_codes[0]),
      data: learning_data(2*j+1, 2*j+0, 2),
      on_finish: function(data) {

        label_learning_choice(data);

        // Evaluate missing data
        if ( data.rt == null ) {

          // Set missing data to true.
          data.missing = true;

          // Increment counter. Check if experiment should end.
          missed_responses++;
          if (missed_responses >= missed_threshold) {
            low_quality = true;
            //jsPsych.endExperiment();
          }

        } else {

          // Set missing data to false.
          data.missing = false;

        }

      }

    }

    // Define looping node.
    const RL_node = {
      timeline: [RL],
      loop_function: function(data) {
        return false;
        // return data.values()[0].missing;
        // commented out because we don't want missed trials to be repeated in the scanner
      }
    }
    trials.push(RL_node);

  }

  // Shuffle trials. Append.
  learning_phase_2 = learning_phase_2.concat( jsPsych.randomization.repeat(trials, 1) );

}

//------------------------------------//
// Define probe phase 2.
//------------------------------------//
// Probe phases are comprised of
// every possible pair combination
// (28 in total) presented 4 times
// (112 total trials).

// Initialize phase array.
probe_phase_2 = [];

// Iteratively define trials
for (i = 8; i < 16; i++) {

  for (j = 8; j < 16; j++) {

    if (i != j) {

      // Append trial.
      var probe = {
        type: 'palminteri-probe',
        symbol_L: symbol_array[i],
        symbol_R: symbol_array[j],
        choices: response_key_codes,
        data: probe_data(i, j, 2),
        on_finish: function(data) {

          // Record choice / accuracy for later analysis (not shown to participant).
          score_probe(data);

          // Evaluate missing data
          if ( data.rt == null ) {

            // Set missing data to true.
            data.missing = true;

            // Increment counter. Check if experiment should end.
            missed_responses++;
            if (missed_responses >= missed_threshold) {
              low_quality = true;
              //jsPsych.endExperiment();
            }

          } else {

            // Set missing data to false.
            data.missing = false;

          }

        }

      }

      // Define looping node.
      const probe_node = {
        timeline: [probe],
        loop_function: function(data) {
          return false;
          // return data.values()[0].missing;
          // commented out because we don't want missed trials to be repeated in the scanner
        }
      }

      // Add trials twice.
      probe_phase_2.push(probe_node);
      probe_phase_2.push(probe_node);
    }

  }

};

// Shuffle trials.
probe_phase_2 = jsPsych.randomization.repeat(probe_phase_2, 1);
