
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    MessageToast
) {
    "use strict";

    return Controller.extend(
        "com.cg.actividades.vistacalendarioactividades.controller.Consolidacion",
        {
            onInit: function () {
                var oData = {
                    reports: [
                        {
                            Month: "Septiembre 2026",
                            Department: "Finance & Procurement",
                            ConsolidacionID: "ID-M-FIN-09",
                            Headcount: "145 empleados",
                            TotalHours: "23,200 hrs",
                            StatusText: "Listo para aprobación",
                            StatusState: "Success"
                        },
                        {
                            Month: "Agosto 2026",
                            Department: "Finance & Procurement",
                            ConsolidacionID: "ID-M-FIN-08",
                            Headcount: "142 empleados",
                            TotalHours: "22,720 hrs",
                            StatusText: "Listo para aprobación",
                            StatusState: "Success"
                        },
                        {
                            Month: "Julio 2026",
                            Department: "Finance & Procurement",
                            ConsolidacionID: "ID-M-FIN-07",
                            Headcount: "145 empleados",
                            TotalHours: "23,200 hrs",
                            StatusText: "Borrador",
                            StatusState: "None"
                        },
                        {
                            Month: "Septiembre 2026",
                            Department: "Sales & Marketing",
                            ConsolidacionID: "ID-M-SAL-09",
                            Headcount: "138 empleados",
                            TotalHours: "22,080 hrs",
                            StatusText: "Listo para aprobación",
                            StatusState: "Success"
                        },
                        {
                            Month: "Agosto 2026",
                            Department: "Sales & Marketing",
                            ConsolidacionID: "ID-M-SAL-08",
                            Headcount: "135 empleados",
                            TotalHours: "21,600 hrs",
                            StatusText: "Borrador",
                            StatusState: "None"
                        }
                    ]
                };

                var oModel = new JSONModel(oData);
                this.getView().setModel(oModel, "consolidacionModel");

                var oFilterModel = new JSONModel({
                    period: "All",
                    status: "All"
                });

                this.getView().setModel(oFilterModel, "filterModel");
            },

            onSelectionChange: function () {
                var oTable = this.byId("consolidacionTable");
                var aSelectedItems = oTable.getSelectedItems();

                this.byId("selectedCounterText").setText(
                    "Seleccionados: " + aSelectedItems.length + " filas"
                );
            },

            onExecuteFilter: function () {
                var oTable = this.byId("consolidacionTable");
                var oBinding = oTable.getBinding("items");

                var sPeriod = this.byId("periodComboBox").getSelectedKey();
                var sStatus = this.byId("statusComboBox").getSelectedKey();

                var aFilters = [];

                if (sPeriod !== "All") {
                    var sMonth = sPeriod === "Aug2026"
                        ? "Agosto 2026"
                        : "Septiembre 2026";

                    aFilters.push(
                        new Filter(
                            "Month",
                            FilterOperator.EQ,
                            sMonth
                        )
                    );
                }

                if (sStatus !== "All") {
                    var sStatusText = sStatus === "Ready"
                        ? "Listo para aprobación"
                        : "Borrador";

                    aFilters.push(
                        new Filter(
                            "StatusText",
                            FilterOperator.EQ,
                            sStatusText
                        )
                    );
                }

                oBinding.filter(aFilters);

                oTable.removeSelections(true);
                this.onSelectionChange();

                MessageToast.show(
                    "Filtros aplicados correctamente."
                );
            },

            onSendForApproval: function () {
                var oTable = this.byId("consolidacionTable");
                var aSelectedItems = oTable.getSelectedItems();

                if (aSelectedItems.length === 0) {
                    MessageToast.show(
                        "Por favor, seleccione al menos un reporte para enviar a aprobación."
                    );
                    return;
                }

                MessageToast.show(
                    "¡Paquete enviado a aprobación del cliente con éxito! (" +
                    aSelectedItems.length + " ítems)"
                );
            },

            onSaveDraft: function () {
                MessageToast.show(
                    "Borrador guardado localmente."
                );
            },

            onCancel: function () {
                var oTable = this.byId("consolidacionTable");

                oTable.removeSelections(true);
                this.onSelectionChange();

                MessageToast.show(
                    "Selección cancelada."
                );
            },

            onExportReport: function () {
                MessageToast.show(
                    "La exportación de datos está pendiente de implementación."
                );
            },

            onSettings: function () {
                MessageToast.show(
                    "La configuración de vista está pendiente de implementación."
                );
            }
        }
    );
});
