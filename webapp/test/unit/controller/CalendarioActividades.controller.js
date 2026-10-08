/*global QUnit*/

sap.ui.define([
	"com/cg/actividades/vistacalendarioactividades/controller/CalendarioActividades.controller"
], function (Controller) {
	"use strict";

	QUnit.module("CalendarioActividades Controller");

	QUnit.test("I should test the CalendarioActividades controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
