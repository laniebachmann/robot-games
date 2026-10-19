//------------------------------------//
// Data saving via DataPipe -> OSF (replaces nivturk-plugins.js / Flask routes).
// Function names match the originals so the experiment code is unchanged.
//------------------------------------//

// Paste the experiment ID from https://pipe.jspsych.org after setting up the OSF component.
// While it is left as the placeholder, nothing is uploaded and saves are logged to the console (local testing).
var DATAPIPE_EXPERIMENT_ID = 'K5yG5VXtJWtz';

// Files written per session (one OSF file each):
//   <id>_palminteri_phase1_<s>.csv   mid-task backup (after probe phase 1)
//   <id>_palminteri_<s>.csv          complete Palminteri data   <- saved before PIT starts
//   <id>_pit_block1_<s>.csv          mid-task backup (after PIT block 1)
//   <id>_pit_<s>.csv                 complete PIT data          <- saved at the end
// Columns left out of the saved file (optional per-task list).
//   trial_duration: identical to rt (10000 on missed trials, which `missing` already marks)
//   stimulus, type: text/labels of instruction and "press SPACEBAR" screens only
//   *_date_now: wall-clock timestamps kept for scanner syncing; not needed online
//               (the relative onsets and time_elapsed cover timing)
var PALMINTERI_DROP = ['trial_duration', 'stimulus', 'type'];
// PIT trials record their own RT / Choice / onsets, so the generic jsPsych columns below only
// carry values for the "press SPACEBAR" screens. PIT `stimulus` (robot identity 0-3 within the
// block) is kept on PIT trials and blanked on the other screens.
var PIT_DROP = ['rt', 'key_press', 'type', 'trial_onset', 'trial_duration'];
function drop_date_now(col) { return /_date_now$/.test(col); }

// Percent of trials answered correctly (0-100, one decimal), for bonus decisions.
// Missed responses count as incorrect. Uses the trials collected so far, so the
// mid-task backup files hold the block-1 value and the full files hold both blocks.
//   Palminteri: learning trials only (chose the better symbol of the pair).
//   PIT: all main-task trials (correct go / no-go; independent of the 20% sham feedback).
function accuracy_pct(trial_type, acc_col) {
  var t = jsPsych.data.get().filter({trial_type: trial_type}).values();
  if (t.length === 0) return null;
  var n = t.reduce(function(s, r) { return s + (Number(r[acc_col]) === 1 ? 1 : 0); }, 0);
  return Math.round(1000 * n / t.length) / 10;
}

function datapipe_save(task_label, on_done, drop) {

  jsPsych.data.addProperties({
    webdriver: BOT_FLAGS.webdriver,
    untrusted_keys: BOT_FLAGS.untrusted_keys,
    untrusted_clicks: BOT_FLAGS.untrusted_clicks,
  });
  if (/^palminteri/.test(task_label)) {
    jsPsych.data.addProperties({learning_accuracy_pct: accuracy_pct('palminteri-learning', 'accuracy')});
  } else if (/^pit/.test(task_label)) {
    var pit_acc = accuracy_pct('pit-trial', 'Accuracy');
    jsPsych.data.addProperties({pit_accuracy_pct: pit_acc});
    // Final file only: overall accuracy and the bonus earned.
    //   overall_accuracy_pct = mean of Palminteri learning accuracy and PIT accuracy
    //   bonus_usd: 60 <= overall <= 75 -> 2.50 ; overall > 75 -> 5.00 ; otherwise 0
    if (task_label === 'pit') {
      var overall = (LEARNING_ACC === null || pit_acc === null) ? null
                    : Math.round(100 * (LEARNING_ACC + pit_acc) / 2) / 100;
      var bonus = (overall === null) ? null : (overall > 75 ? 5.00 : (overall >= 60 ? 2.50 : 0));
      jsPsych.data.addProperties({overall_accuracy_pct: overall, bonus_usd: bonus});
    }
  }

  var filename = SUBJECT_ID + '_' + task_label + '_' + SESSION_CODE + '.csv';
  var rows     = jsPsych.data.get().values();
  if (drop) {
    rows = rows.map(function(r) {
      var o = {};
      Object.keys(r).forEach(function(k) { if (drop.indexOf(k) < 0 && !drop_date_now(k)) o[k] = r[k]; });
      if (drop === PIT_DROP && r.trial_type !== 'pit-trial') { delete o.stimulus; }
      return o;
    });
  }
  var data     = data_to_csv(rows);

  if (DATAPIPE_EXPERIMENT_ID.indexOf('PASTE_') === 0) {
    console.warn('[DataPipe] experiment ID not set; NOT uploading ' + filename + ' (' + data.length + ' chars)');
    window.LAST_SAVED = window.LAST_SAVED || {};
    window.LAST_SAVED[filename] = data;   // inspect in the console during testing
    if (on_done) on_done(true);
    return;
  }

  var attempt = 0;
  function send() {
    attempt++;
    fetch('https://pipe.jspsych.org/api/data/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Accept': '*/*'},
      body: JSON.stringify({experimentID: DATAPIPE_EXPERIMENT_ID, filename: filename, data: data}),
    }).then(function(response) {
      if (!response.ok) { throw new Error('HTTP ' + response.status); }
      console.log('[DataPipe] saved ' + filename);
      if (on_done) on_done(true);
    }).catch(function(error) {
      console.error('[DataPipe] save failed (attempt ' + attempt + '): ' + filename, error);
      if (attempt < 3) { setTimeout(send, 2000); }
      else if (on_done) { on_done(false); }
    });
  }
  send();
}

// CSV export. jsPsych 6's built-in .csv() turns objects into "[object Object]" (e.g. the
// ACCURACY_CHECK result) and arrays into bare comma lists (PIT "Keys"); here those cells are
// written as JSON text instead, so nothing is lost. In R: jsonlite::fromJSON(df$Keys[1]).
function data_to_csv(rows) {
  var cols = [];
  rows.forEach(function(r) { Object.keys(r).forEach(function(k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
  var cell = function(v) {
    if (v === undefined || v === null) return '';
    var s = (typeof v === 'object') ? JSON.stringify(v) : String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  };
  var lines = [cols.map(cell).join(',')];
  rows.forEach(function(r) { lines.push(cols.map(function(k) { return cell(r[k]); }).join(',')); });
  return lines.join('\r\n');
}

function show_saving_message() {
  jsPsych.getDisplayElement().innerHTML =
    '<p style="font-size:24px;">Saving your responses, please wait...</p>';
}

function pass_data_palminteri(phase) {
  if (phase == 1) {
    datapipe_save('palminteri_phase1', null, PALMINTERI_DROP);   // task continues while this uploads
  } else {
    show_saving_message();
    LEARNING_ACC = accuracy_pct('palminteri-learning', 'accuracy');   // carried to the PIT page
    datapipe_save('palminteri', function() { go_to('game2_instructions.html'); }, PALMINTERI_DROP);
  }
}

function pass_data_pit(phase) {
  if (phase == 1) {
    datapipe_save('pit_block1', null, PIT_DROP);
  } else {
    show_saving_message();
    datapipe_save('pit', function() {
      if (IS_PROLIFIC) { window.top.location.href = 'https://app.prolific.com/submissions/complete?cc=' + PROLIFIC_COMPLETION_CODE; }
      else { go_to('complete.html'); }
    }, PIT_DROP);
  }
}

// No server to log messages to; keep the calls in the experiment code harmless.
function pass_message_surveys(msg)    { console.log('[message]', msg); }
function pass_message_palminteri(msg) { console.log('[message]', msg); }
function pass_message_pit(msg)        { console.log('[message]', msg); }
