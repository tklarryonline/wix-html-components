(LessonItemComponent)();

function LessonItemComponent() {
  'use strict';

  angular
    .module('BookingLessonApp')
    .component('lessonItem', {
      templateUrl: 'js/booking-lesson-app/lesson/lesson-item.html',
      controller: LessonItemController,
      bindings: {
        // variables
        activities: '<',
        dates: '<',
        lesson: '<',
        participants: '<',
        type: '<',

        // functions
        deleteLesson: '<',
        moveLessonGroupToPrivate: '<',
        moveLessonToGroup: '<',
      },
    })
    .component('lessonItemFirstTimer', {
      templateUrl: 'js/booking-lesson-app/lesson/lesson-item.first-timer.html',
      controller: LessonItemController,
      bindings: {
        // variables
        activities: '<',
        dates: '<',
        lesson: '<',
        participants: '<',
        type: '<',

        // functions
        deleteLesson: '<',
      },
    });

  LessonItemController.$inject = [
    '_',
    'isParticipantFT',
    'settings',
  ];
}

function LessonItemController(_, isParticipantFT, settings) {
  const CHILD_ADVICE = 'It is strongly advised for any child aged 5 and under to do ' +
    'a separate lesson, either as a group or a private lesson';
  const MAX_PEOPLE_ADVICE = 'Up to 4 people can join a lesson';

  let vm = this;

  // Initialises
  this.$onInit = onInit;

  function onInit() {
    vm.settings = settings;

    vm.availableActivities = buildActivitiesList(vm.participants);
    // Gets the first available activity
    vm.lesson.activity = vm.availableActivities[0];

    // Preps for participants' checkboxes
    resetCheckboxes();

    // Options for date picker
    vm.toggleDatePicker = false;
    vm.datePickerOptions = {
      maxDate: vm.dates[vm.dates.length - 1],
      minDate: vm.dates[0],
      initDate: vm.dates[0],
      showWeeks: false,
      startingDay: 1, // LN: 1 for Monday
    };

    // Binds functions
    vm.isLessonPrivateOrDisability = isLessonPrivateOrDisability;
    vm.getParticipantsColumnCssClass = getParticipantsColumnCssClass;
    vm.getTimeOptions = getTimeOptions;
    vm.onAddLesson = onAddLesson;
    vm.onDelete = onDelete;
    vm.onMove = onMove;
    vm.pickParticipant = pickParticipant;
    vm.disableParticipant = disableParticipant;
    vm.compareParticipant = compareParticipant;
    vm.activityOnChange = activityOnChange;
    vm.showBinButton = showBinButton();
  }

  ///////////

  function getTimeOptions() {
    return isLessonMatchTypes(['group.adults'])
      ? settings.TIME_OPTIONS.filter((item) => item !== 'All day')
      : settings.TIME_OPTIONS;
  }

  function onDelete() {
    vm.deleteLesson(vm.lesson);
  }

  function onMove() {
    // Wonders if there is `movedFrom` property
    if (vm.lesson.hasOwnProperty('movedFrom')) {
      // If there is -> 2nd move from Private
      vm.moveLessonToGroup(vm.lesson);
    } else {
      // If has no movedFrom -> first move from Group
      vm.lesson.movedFrom = vm.type;
      vm.moveLessonGroupToPrivate(vm.lesson);
    }

    vm.deleteLesson(vm.lesson);
  }

  function getParticipantsColumnCssClass() {
    return isLessonPrivateOrDisability() ? 'col-sm-5' : 'col-sm-6';
  }

  function isLessonPrivateOrDisability() {
    return isLessonMatchTypes(['private', 'disability']);
  }

  function isLessonGroup() {
    return isLessonMatchTypes([
      'group.adults',
      'group.children',
      'group.mini',
    ]);
  }

  function isLessonMatchTypes(types) {
    return types.indexOf(vm.type) > -1;
  }

  function onAddLesson() {
    vm.duplicateLesson(vm.lesson);
  }

  function buildSpecificParticipantsList() {
    let participantCheckboxes = [];

    for (const participant of vm.participants) {
      let participantCheckbox = {
        participant: participant,
        checked: _.findIndex(vm.lesson.participants, ['_id', participant._id]) >= 0,
        disabled: false,
        message: null,
        isFt: false,
      };

      // Wonders if participant is FT
      const isFt = isParticipantFT(vm.lesson, participant);
      // If FT && (Group || (Private && movedFrom))
      if (
        isFt
        && (
          isLessonGroup()
          || (
            isLessonMatchTypes(['private'])
            && vm.lesson.hasOwnProperty('movedFrom')
          )
        )
      ) {
        participantCheckbox.disabled = true;
        participantCheckbox.isFt = true;
        participantCheckbox.message = `First-time lesson for ${vm.lesson.activity} is mandatory`;
      }

      if (!participantCheckbox.checked) {
        participantCheckbox.disabled = disableParticipant(participantCheckbox);
      }

      participantCheckboxes.push(participantCheckbox);
    }

    return participantCheckboxes;
  }

  function compareParticipant(p1, p2) {
    return p1._id === p2._id;
  }

  function pickParticipant(pc) {
    pc.checked = !pc.checked;

    if (isLessonMatchTypes(['disability'])) return;

    if (isLessonMatchTypes(['private'])) {
      let checkCount = pc.checked ? 1 : -1;

      if (pc.participant.age > 5) {
        vm.innerCounts.pickedOthers += checkCount;
      } else {
        vm.innerCounts.pickedMinis += checkCount;
      }
    }

    let otherCheckboxes = vm.participantCheckboxes.filter(p => p !== pc);

    for (let oc of otherCheckboxes) {
      oc.disabled = disableParticipant(oc);
    }
  }

  function buildActivitiesList() {
    const baseActivities = isLessonMatchTypes(['private'])
      ? settings.ACTIVITY_TYPES.private
      : settings.ACTIVITY_TYPES.default;

    return _.intersection(vm.activities, baseActivities);
  }

  function invalidActivityAdvice(participantName) {
    return `${participantName} has not elected to do ${vm.lesson.activity}`;
  }

  function disableParticipant(pc) {
    // LN Don't try to simplify these logic blocks
    // They may look lengthy, but easier to understand than a short one with lots of && and ||

    if (pc.isFt) {
      return true;
    }

    pc.message = null;

    // If the chosen activity is not in the participant's chosenActivities,
    // disable the participant
    const participantActivities = JSON.parse(pc.participant.activities);
    if (!participantActivities[`${vm.lesson.activity.toLowerCase()}Chosen`]) {
      pc.message = invalidActivityAdvice(pc.participant.firstName);
      return true;
    }

    // If this is mini, checks if others are picked
    if (pc.participant.age < settings.AGE_GROUP.MINI) {
      if (vm.innerCounts.pickedOthers > 0) {
        pc.message = CHILD_ADVICE;
        return true;
      }

      if (vm.innerCounts.pickedMinis < settings.MAX_PEOPLE) {
        pc.message = MAX_PEOPLE_ADVICE;
        return false;
      }

      return !pc.checked;
    }

    if (vm.innerCounts.pickedMinis > 0) {
      pc.message = CHILD_ADVICE;
      return true;
    }

    if (vm.innerCounts.pickedOthers < settings.MAX_PEOPLE) {
      pc.message = MAX_PEOPLE_ADVICE;
      return false;
    }

    return !pc.checked;
  }

  function activityOnChange() {
    // Clears the previous participants list
    vm.lesson.participants = [];

    resetCheckboxes();

    // Update the showBinButton
    vm.showBinButton = showBinButton();
  }

  function resetCheckboxes() {
    // Preps for participants' checkboxes
    vm.innerCounts = {
      pickedMinis: 0,
      pickedOthers: 0,
    };
    vm.participantCheckboxes = buildSpecificParticipantsList();
  }

  function showBinButton() {
    // True if there is no FT identified in the participants
    const hasFts = _.some(vm.participants, p => isParticipantFT(vm.lesson, p));
    const wasMoved = vm.lesson.hasOwnProperty('movedFrom');

    return (isLessonPrivateOrDisability() && !wasMoved) || (!hasFts && isLessonGroup());
  }
}
