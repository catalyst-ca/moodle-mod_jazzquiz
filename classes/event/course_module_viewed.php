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

/**
 * The mod_quiz course module viewed event.
 *
 * @package    mod_jazzquiz
 * @author     John Hoopes <moodle@madisoncreativeweb.com>
 * @copyright  2015 University of Wisconsin - Madison
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace mod_jazzquiz\event;

defined('MOODLE_INTERNAL') || die();

/**
 * The mod_quiz course module viewed event class.
 *
 * @package    mod_jazzquiz
 * @since      Moodle 2.8
 * @author     John Hoopes <moodle@madisoncreativeweb.com>
 * @copyright  2015 University of Wisconsin - Madison
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class course_module_viewed extends \core\event\course_module_viewed {

    /**
     * Init method.
     *
     * @return void
     */
    protected function init() {
        $this->data['crud'] = 'r';
        $this->data['edulevel'] = self::LEVEL_PARTICIPATING;
        $this->data['objecttable'] = 'jazzquiz';
    }
}
