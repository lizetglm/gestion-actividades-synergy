
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend(
        "com.cg.actividades.vistacalendarioactividades.controller.Configuracion",
        {
            onInit: function () {
                this._defaultSettings = {
                    dailyHourLimit: 8.0,
                    weeklyOvertime: 40.0,
                    submissionThreshold: 24,
                    closingDay: "Friday",
                    gracePeriod: 3,
                    approvalLimit: 5,
                    emailNotifications: true,
                    managerEscalations: true,
                    weeklyReports: false
                };

                this._savedSettings = JSON.parse(
                    JSON.stringify(this._defaultSettings)
                );

                var oModel = new JSONModel(
                    JSON.parse(JSON.stringify(this._defaultSettings))
                );

                this.getView().setModel(oModel, "settings");
            },

            onSave: function () {
                var oModel = this.getView().getModel("settings");
                var oData = oModel.getData();

                var aNumericFields = [
                    { key: "dailyHourLimit", label: "Daily Hour Limit", min: 0 },
                    { key: "weeklyOvertime", label: "Weekly Overtime Threshold", min: 0 },
                    { key: "submissionThreshold", label: "Submission Threshold", min: 0 },
                    { key: "gracePeriod", label: "Grace Period", min: 0 },
                    { key: "approvalLimit", label: "Approval Limit", min: 1 }
                ];

                for (var i = 0; i < aNumericFields.length; i++) {
                    var oField = aNumericFields[i];
                    var nValue = Number(oData[oField.key]);

                    if (
                        oData[oField.key] === "" ||
                        !Number.isFinite(nValue) ||
                        nValue < oField.min
                    ) {
                        MessageToast.show(
                            "Revisa el campo: " + oField.label
                        );
                        return;
                    }
                }

                this._savedSettings = JSON.parse(
                    JSON.stringify(oData)
                );

                MessageToast.show(
                    "Configuración guardada correctamente (prueba local)."
                );

                console.log("Configuración guardada:", this._savedSettings);
            },

            onCancel: function () {
                this.getView().getModel("settings").setData(
                    JSON.parse(JSON.stringify(this._savedSettings))
                );

                MessageToast.show("Se descartaron los cambios.");
            },

            onReset: function () {
                this.getView().getModel("settings").setData(
                    JSON.parse(JSON.stringify(this._defaultSettings))
                );

                MessageToast.show(
                    "Se restauraron los valores predeterminados."
                );
            },

            onBack: function () {
                window.history.back();
            },

            onHome: function () {
                MessageToast.show("Navegación de prueba: Home.");
            }
        }
    );
});
