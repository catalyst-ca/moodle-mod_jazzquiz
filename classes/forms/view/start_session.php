<?php
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

namespace mod_jazzquiz\forms\view;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/formslib.php');

/**
 * Start session form displayed to instructors/users who can control the quiz
 *
 * @package     mod_jazzquiz
 * @author      John Hoopes <moodle@madisoncreativeweb.com>
 * @copyright   2014 University of Wisconsin - Madison
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class start_session extends \moodleform {

    /**
     * Overriding parent function to account for namespace in the class name
     * so that client validation works
     *
     * @return mixed|string
     */
    protected function get_form_identifier() {

        $class = get_class($this);

        return preg_replace('/[^a-z0-9_]/i', '_', $class);
    }


    /**
     * Definition of the session start form
     *
     */
    public function definition() {

        $mform = $this->_form;

        $mform->addElement('text', 'sessionname', get_string('sessionname', 'jazzquiz'));
        $mform->setType('sessionname', PARAM_TEXT);
        $mform->addRule('sessionname', get_string('sessionname_required', 'jazzquiz'), 'required', null, 'client');

        $mform->addElement('advcheckbox', 'anonymizeresponses', get_string('anonymousresponses', 'jazzquiz'));
        $mform->addHelpButton('anonymizeresponses', 'anonymousresponses', 'jazzquiz');
        $mform->setDefault('anonymizeresponses', 1);
        $mform->disabledIf('anonymizeresponses', 'fullanonymize', 'checked');

        $mform->addElement('advcheckbox', 'fullanonymize', get_string('fullanonymize', 'jazzquiz'));
        $mform->addHelpButton('fullanonymize', 'fullanonymize', 'jazzquiz');
        $mform->setDefault('fullanonymize', 0);

        $mform->addElement('advcheckbox', 'showfeedback', 'Show feedback');
        $mform->setDefault('showfeedback', 0);

        $mform->addElement('submit', 'submitbutton', get_string('start_session', 'jazzquiz'));
    }

    /**
     * Peform validation on the form
     *
     * @param array $data
     * @param array $files
     *
     * @return array $errors array of errors
     */
    public function validations($data, $files) {

        $errors = array();

        if (empty($data['sessionname'])) {
            $errors['sessionname'] = get_string('sessionname_required', 'jazzquiz');
        }

        return $errors;
    }


}




