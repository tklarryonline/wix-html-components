(function () {
  'use strict';

  angular
    .module('BookingLessonApp')
    .component('lessonItem', {
      templateUrl: 'js/booking-lesson-app/lesson/lesson-item.html',
      controller: LessonItemController,
      bindings: {
        // letiables
        lesson: '<',
        type: '<',
        participants: '<',

        // functions
        duplicateLesson: '<',
        deleteLesson: '<'
      }
    });

  LessonItemController.$inject = ['settings'];

  function LessonItemController(settings) {
    let vm = this;

    // Initialises
    this.$onInit = onInit;

    function onInit() {
      vm.settings = settings;

      // Binds functions
      vm.isLessonPrivate = isLessonPrivate;
      vm.getParticipantsColumnCssClass = getParticipantsColumnCssClass;
      vm.getTimeOptions = getTimeOptions;
      vm.onAddLesson = onAddLesson;
      vm.onDelete = onDelete;
    }

    function getTimeOptions() {
      if (['group.children', 'group.mini'].indexOf(vm.type) > -1) {
        return settings.TIME_OPTIONS;
      }

      return settings.TIME_OPTIONS.filter(function (item) {
        return item !== 'All day';
      });
    }

    function onDelete() {
      vm.deleteLesson(vm.lesson);
    }

    function getParticipantsColumnCssClass() {
      return isLessonPrivate() ? 'col-sm-3' : 'col-sm-4';
    }

    function isLessonPrivate() {
      return ['private', 'disability'].indexOf(vm.type) !== -1;
    }

    function onAddLesson() {
      vm.duplicateLesson(vm.lesson);
    }
  }
})();
