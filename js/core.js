// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * @package   mod_jazzquiz
 * @author    John Hoopes <moodle@madisoncreativeweb.com>
 * @copyright 2014 University of Wisconsin - Madison
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

var jazzquiz = {

    state: '',
    is_new_state: false,
    is_instructor: false,
    siteroot: '',

    current_responses: [],
    total_responses: 0,
    chosen_improvisation_question_slot: 0,

    qcounter: false,

    quiz: {

        activity_id: 0,
        session_id: 0,
        attempt_id: 0,
        current_question_slot: 0,
        session_key: '',
        slots: [],
        show_votes_upon_review: false,

        questions: [],

        resume: {
            are_we_resuming: false,
            state: '',
            action: '',
            current_question_slot: 0,
            question_time: 0,
            delay: 0,
            tries: 0
        },

        question: {
            is_running: false,
            is_ended: true,
            is_last: false,
            is_saving: false,
            is_submitted: false,
            end_time: 0,
            is_vote_running: false,
            has_votes: false,
            try_count: 0,
            countdown_time_left: 0
        }

    },

    options: {
        show_not_responded: false,
        show_responses: false,
        is_showing_correct_answer: false
    },

    // Instructor temporary variables
    fullscreen_interval_handle: undefined,

    // Student temporary variables
    vote_answer: undefined

};

// Set HTTP status codes for easier readability
var HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
};

/**
 * Defines ajax functions in its namespace
 *
 *
 * @type {{httpRequest: {}, init: init, create_request: create_request}}
 */
jazzquiz.ajax = {

    httpRequest: {},

    init: function () {

    },

    /**
     * Create and send a request
     * @param url the path to the file you are calling, note this is only for local requests as siteroot will be added to the front of the url
     * @param params the parameters you'd like to add.  This should be an object like the following example
     *
     *          params = { 'id' : 1, 'questionid': 56, 'answer': 'testing' }
     *
     *                  will convert to these post parameters
     *
     *          'id=1&questionid=56&answer=testing'
     *
     * @param callback callable function to be the callback onreadystatechange, must accept httpstatus and the response
     */
    create_request: function (url, params, callback) {

        // Append default parameters
        if (params instanceof FormData) {
            params.append('rtqid', jazzquiz.quiz.activity_id);
            params.append('sessionid', jazzquiz.quiz.session_id);
            params.append('sesskey', jazzquiz.quiz.session_key);
        } else if (params !== null) {
            params.rtqid = jazzquiz.quiz.activity_id;
            params.sessionid = jazzquiz.quiz.session_id;
            params.sesskey = jazzquiz.quiz.session_key;
        }

        // Re-init a new request ( so we don't have things running into each other)
        if (window.XMLHttpRequest) { // Mozilla, Safari, ...
            var httpRequest = new XMLHttpRequest();
            if (httpRequest.overrideMimeType) {
                httpRequest.overrideMimeType('text/xml');
            }
        } else if (window.ActiveXObject) { // IE
            try {
                var httpRequest = new ActiveXObject("Msxml2.XMLHTTP");
            }
            catch (e) {
                try {
                    httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
                }
                catch (e) {
                    alert(window.M.utils.get_string('httprequestfail', 'jazzquiz'));
                }
            }
        }

        httpRequest.onreadystatechange = function () {
            if (this.readyState === XMLHttpRequest.DONE) {

                var status = this.status;
                var response = '';

                // TODO: Clean this up
                if (status === HTTP_STATUS.ERROR) {
                    try {
                        response = JSON.parse(this.responseText);
                    } catch (Error) {
                        response = '';
                    }
                } else {
                    try {
                        response = JSON.parse(this.responseText);
                    } catch (Error) {
                        response = this.responseText;
                    }

                }

                // Let's run the callback
                callback(status, response);

            }
        };

        httpRequest.open('POST', jazzquiz.siteroot + url, true);

        var parameters = '';

        if (params instanceof FormData) {

            // Already valid to send with XMLHttpRequest
            parameters = params;

        } else {

            // Separate it out
            httpRequest.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

            for (var param in params) {
                if (params.hasOwnProperty(param)) {
                    if (parameters.length > 0) {
                        parameters += '&';
                    }
                    parameters += param + '=' + encodeURI(params[param]);
                }
            }

        }

        httpRequest.send(parameters);

    }
};

jazzquiz.request_quiz_info = function () {

    // Send request
    jazzquiz.ajax.create_request('/mod/jazzquiz/quizinfo.php', {}, function (status, response) {

        if (status !== HTTP_STATUS.OK) {
            console.log('There was an error....' + response);
            return;
        }

        // Change the local state
        jazzquiz.change_quiz_state(response.status, response);

        // Schedule next update
        // TODO: Remove this if statement, and rather have a time defined in the specific javascript files.
        // The instructor has a higher update frequency since there is usually only one,
        // but students might be in the hundreds, so we want to limit them to every second instead.
        if (jazzquiz.is_instructor) {
            setTimeout(jazzquiz.request_quiz_info, 500);
        } else {
            setTimeout(jazzquiz.request_quiz_info, 2000);
        }

    });

};

jazzquiz.render_all_mathjax = function () {
    Y.fire(M.core.event.FILTER_CONTENT_UPDATED, {
        nodes: new Y.NodeList(document.getElementsByClassName('jazzquiz-latex-wrapper'))
    });
};

jazzquiz.add_mathjax_element = function (id, latex) {
    jQuery('#' + id).html('<span class="jazzquiz-latex-wrapper"><span class="filter_mathjaxloader_equation">' + latex + '</span></span>');
    this.render_all_mathjax();
};

jazzquiz.render_maxima_equation = function (input, target_id, slot) {

    var target = document.getElementById(target_id);
    if (target === null) {
        console.log('Target element #' + target_id + ' not found.');
        return;
    }

    input = encodeURIComponent(input);

    var id = jazzquiz.quiz.attempt_id;

    this.ajax.create_request('/mod/jazzquiz/stack.php?slot=' + slot + '&id=' + id + '&name=ans1&input=' + input, null, function (status, response) {

        if (status !== HTTP_STATUS.OK) {
            console.log('Failed to get LaTeX for #' + target_id);
            return;
        }

        jazzquiz.add_mathjax_element(target_id, response.latex);

    });

};

jazzquiz.get_question_body_formatted = function (questionid) {
    var original = document.getElementById('q' + questionid + '_container');
    if (original === null) {
        return 'Not found';
    }

    var questionbox = original.cloneNode(true);

    jQuery(questionbox).find('.info').remove();
    jQuery(questionbox).find('.im-controls').remove();
    jQuery(questionbox).find('.questiontestslink').remove();
    jQuery(questionbox).find('input').remove();
    jQuery(questionbox).find('label').remove(); // Some inputs have labels
    jQuery(questionbox).find('.ablock.form-inline').remove();
    jQuery(questionbox).find('.save_row').remove();

    return questionbox.innerHTML;
};

/**
 * Callback for when the quiz page is fully loaded
 */
jazzquiz.quiz_page_loaded = function () {

    // Wait for jQuery
    if (!window.jQuery) {
        console.log('Waiting for jQuery... Trying again in 50ms');
        setTimeout(function () {
            console.log('Retrying...');
            jazzquiz.quiz_page_loaded();
        }, 50);
        return;
    }

    // Initialize the AJAX object
    this.ajax.init();

    // Insert the initialization data
    var prop;
    for (prop in jazzquiz_root_state) {
        if (jazzquiz_root_state.hasOwnProperty(prop)) {
            this[prop] = jazzquiz_root_state[prop];
        }
    }
    for (prop in jazzquiz_quiz_state) {
        if (jazzquiz_quiz_state.hasOwnProperty(prop)) {
            this.quiz[prop] = jazzquiz_quiz_state[prop];
        }
    }

    // Show controls
    if (this.is_instructor) {
        jQuery('#controlbox').removeClass('hidden');
    }

    // See if we're resuming a quiz or not
    if (this.quiz.resume.are_we_resuming) {

        // Yep, let's resume.
        this.resume_quiz();

        // Return early
        return;
    }

    // Not resuming, so we'll show the instructions
    jQuery('#jazzquiz_instructions_container').removeClass('hidden');
    jQuery('#loadingbox').addClass('hidden');

    // Lastly call the instructor/student's quiz_info function
    this.request_quiz_info();

};

jazzquiz.resume_quiz = function () {

    switch (this.quiz.resume.action) {

        case 'waitforquestion':

            if (this.is_instructor) {
                jQuery('#inquizcontrols').removeClass('btn-hide');
                jQuery('#startquiz').addClass('btn-hide');
                // Instructor resume waitfor question needs to be instantiated
                // as their quizinfo doesn't handle the wait for question case
                this.waitfor_question(this.quiz.resume.current_question_slot, this.quiz.resume.question_time, this.quiz.resume.delay);
            }

            break;

        case 'startquestion':

            if (this.is_instructor) {
                jQuery('#inquizcontrols').removeClass('btn-hide');
                jQuery('#startquiz').addClass('btn-hide');
                if (this.quiz.resume.question_time === 0) {
                    // Enable the "End question" button
                    this.control_buttons([
                        'endquestion',
                        'toggleresponses',
                        'togglenotresponded'
                    ]);
                }
            }

            this.goto_question(this.quiz.resume.current_question_slot, this.quiz.resume.question_time, this.quiz.resume.tries);
            this.quiz.question.is_running = true;
            this.loading(null, 'hide');

            break;

        case 'reviewing':

            // Setup review for instructors, otherwise display reviewing for students
            if (this.is_instructor) {

                this.loading(null, 'hide');

                // Load right controls if available
                jQuery('#inquizcontrols').removeClass('btn-hide');
                jQuery('#startquiz').addClass('btn-hide');

                this.quiz.question.is_running = false;
                this.quiz.current_question_slot = this.quiz.resume.current_question_slot;
                this.quiz.question.is_ended = true;

                this.gather_results();

            } else {

                this.loading(null, 'hide');
                jQuery('#jazzquiz_info_container').removeClass('hidden').html(M.util.get_string('waitforrevewingend', 'jazzquiz'), true);

            }
            break;

        case 'voting':
        case 'preparing':
            this.loading(null, 'hide');
            break;

        default:
            break;
    }

    this.request_quiz_info();

};

jazzquiz.hide_instructions = function () {
    jQuery('#jazzquiz_instructions_container').addClass('hidden');
};

/**
 * General function for waiting for the question
 *
 * @param slot
 * @param question_time
 * @param delay
 */
jazzquiz.waitfor_question = function (slot, question_time, delay) {

    this.quiz.question.countdown_time_left = delay;

    var quiz_info_text = document.createElement('div');
    quiz_info_text.innerHTML = M.util.get_string('waitforquestion', 'jazzquiz');
    quiz_info_text.setAttribute('id', 'quizinfotext');
    quiz_info_text.setAttribute('style', 'display: inline-block');

    var quiz_info_time = document.createElement('div');
    quiz_info_time.innerHTML = "&nbsp;" + delay.toString() + " " + M.util.get_string('seconds', 'moodle');
    quiz_info_time.setAttribute('id', 'quizinfotime');
    quiz_info_time.setAttribute('style', 'display: inline-block;');

    // Start the countdown
    this.counter = setInterval(function () {

        jazzquiz.quiz.question.countdown_time_left--;
        var time_left = jazzquiz.quiz.question.countdown_time_left;

        if (time_left <= 0) {

            clearInterval(jazzquiz.counter);
            jazzquiz.goto_question(slot, question_time);

        } else {

            quiz_info_time.innerHTML = "&nbsp;" + time_left.toString() + " " + M.util.get_string('seconds', 'moodle');

        }

    }, 1000);

    jQuery('#jazzquiz_info_container')
        .html('')
        .removeClass('hidden')
        .append(quiz_info_text)
        .append(quiz_info_time);

    jazzquiz.hide_instructions();
};


jazzquiz.goto_question = function (slot, question_time, tries) {

    jQuery('#jazzquiz_responded_container').addClass('hidden').html('');
    jQuery('#jazzquiz_response_info_container').addClass('hidden').html('');
    jQuery('#jazzquiz_responses_container').addClass('hidden').html('');
    jQuery('#jazzquiz_info_container').addClass('hidden').html('');

    // Get question box container
    var $question_box = jQuery('#q' + slot + '_container');

    // Remove existing input in case this is a re-poll
    $question_box.find('input[type=text]').val('');
    $question_box.find('input[type=number]').val('');
    $question_box.find('input[type=radio]').removeAttr('checked');
    $question_box.find('input[type=checkbox]').removeAttr('checked');

    // Show it
    $question_box.removeClass('hidden');

    var set_try_count = false;

    // Make sure the try_count is always correct (this is for re-polling of questions for students, and for resuming of a quiz.
    if (!this.is_instructor) {

        var question = this.quiz.questions[slot];
        var total_tries = question.tries;

        if (tries !== undefined) {

            if (tries > 0 && total_tries > 1) {

                this.quiz.question.try_count = (total_tries - tries) + 1;

                // Setting to true so we don't overwrite later as the try number being 1
                set_try_count = true;

                this.update_tries(tries, slot);

            } else if (tries > 0 && total_tries === 1) {

                // Let the question proceed for their first try on a 1 try question

            } else {

                this.hide_all_questionboxes();
                jQuery('#jazzquiz_info_container').removeClass('hidden').html(M.util.get_string('notries', 'jazzquiz'));
                this.quiz.current_question_slot = slot;

                // Return early so that we don't start any questions when there are no tries left.
                return;
            }
        } else {

            // There's no resuming tries to set to, so just set to the total tries, if it's greater than 1.
            if (total_tries > 1) {
                this.update_tries(total_tries, slot);
            }
        }

    }

    // Check to see if question_time is 0.  If it is 0, then we want to have no timer for this question
    // This is so we don't need a ton of fields passed to this function, as question time of 0 is sufficient
    // for no timer.
    // Also make sure the question_time_text is there if we have a timer for this question
    var question_timer = document.getElementById('q' + slot + '_questiontime');
    var question_timer_text = document.getElementById('q' + slot + '_questiontimetext');
    if (question_time === 0) {

        question_timer.innerHTML = '&nbsp;';
        question_timer_text.innerHTML = '&nbsp;';

        // Make sure this is false for the if statements in other functions that clear the timer if it's there
        this.qcounter = false;

        // QuizInfo will handle the end of a question for students
        // for instructors they are the initiators of a question end so they won't need an update

    } else {

        // Otherwise set up the timer
        question_timer_text.innerHTML = M.util.get_string('timertext', 'jazzquiz');
        question_timer.innerHTML = "&nbsp;" + question_time + ' ' + M.util.get_string('seconds', 'moodle');

        this.quiz.question.end_time = new Date().getTime() + question_time * 1000;

        this.qcounter = setInterval(function () {

            var current_time = new Date().getTime();

            if (current_time > jazzquiz.quiz.question.end_time) {

                jazzquiz.quiz.question.is_running = false;
                clearInterval(jazzquiz.qcounter);
                jazzquiz.qcounter = false;

                if (jazzquiz.is_instructor) {
                    jazzquiz.handle_question(slot);
                }

            } else {

                // Show time left in seconds
                var time_left = (jazzquiz.quiz.question.end_time - current_time) / 1000;
                time_left = number_format(time_left, 0, '.', ',');
                question_timer.innerHTML = '&nbsp;' + time_left.toString() + " " + M.util.get_string('seconds', 'moodle');

            }

        }, 1000);
    }

    if (set_try_count === false) {
        this.quiz.question.try_count = 1;
    }

    this.quiz.current_question_slot = slot;
};

/**
 * Wrapper for handle_question when the user clicks save
 *
 */
jazzquiz.save_question = function () {

    var slot = this.quiz.current_question_slot;

    // Current question refers to the slot number
    // Check if the question has more than 1 try, if so don't clear the timer, and just handle question
    var question = this.quiz.questions[slot];

    if (question.tries > 1) {

        // Update try count
        this.quiz.question.try_count++;
        this.update_tries((question.tries - this.quiz.question.try_count) + 1, slot);

        // If the try number is less than the total tries then just handle question, don't hide or clear anything
        if (this.quiz.question.try_count <= question.tries) {
            this.handle_question(slot, false);
            return;
        }

    }

    // This code is run if there are no more tries
    // or if the total number of tries is 1

    // Clear timer
    if (this.qcounter) {
        clearInterval(this.qcounter);
    }
    jQuery('#q' + slot + '_questiontimetext').html('');
    jQuery('#q' + slot + '_questiontime').html('');

    this.handle_question(slot);
};


/**
 * Util function to hide all question boxes
 *
 */
jazzquiz.hide_all_questionboxes = function () {

    for (var prop in this.quiz.questions) {
        if (this.quiz.questions.hasOwnProperty(prop)) {
            var slot = this.quiz.questions[prop].slot;
            var question_box = document.getElementById('q' + slot + '_container');
            // only do this for elements actually found
            if (typeof question_box !== 'undefined') {
                if (question_box.classList.contains('hidden')) {
                    // already hidden
                } else {
                    question_box.classList.add('hidden');
                }
            }
        }
    }
};

/**
 * Utility function to show/hide the loading box
 * As well as provide a string to place in the loading text
 *
 * @param string
 * @param action
 */
jazzquiz.loading = function (string, action) {

    var loadingbox = document.getElementById('loadingbox');
    var loadingtext = document.getElementById('loadingtext');

    if (action === 'hide') {

        // hides the loading box
        if (!loadingbox.classList.contains('hidden')) {
            loadingbox.classList.add('hidden');
        }

    } else if (action === 'show') {

        // show the loading box with the string provided
        if (loadingbox.classList.contains('hidden')) {
            loadingbox.classList.remove('hidden');
        }
        loadingtext.innerHTML = string;

    }
};

/**
 * Update the trycount string for the correct count number
 *
 * @param count The number of tries left
 * @param qnum the question number to update
 */
jazzquiz.update_tries = function (count, qnum) {

    var try_count = M.util.get_string('trycount', 'jazzquiz', {
        'tries': count
    });

    jQuery('#q' + qnum + '_trycount').html(try_count);

};

/**
 * PHP JS function for number_format analog
 *
 *
 * @param number
 * @param decimals
 * @param dec_point
 * @param thousands_sep
 * @returns {*|string}
 */
function number_format(number, decimals, dec_point, thousands_sep) {
    //  discuss at: http://phpjs.org/functions/number_format/
    number = (number + '')
        .replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        s = '',
        toFixedFix = function (n, prec) {
            var k = Math.pow(10, prec);
            return '' + (Math.round(n * k) / k)
                .toFixed(prec);
        };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n))
        .split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '')
            .length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1)
            .join('0');
    }
    return s.join(dec);
}
