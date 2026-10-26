sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/VBox",
    "sap/m/Text",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/UIComponent",
    "sap/ui/export/Spreadsheet"
], function (Controller, VBox, Text, JSONModel, UIComponent, Spreadsheet) {
    "use strict";

	return Controller.extend("ns.frontend.controller.CalendarioActividades", {
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        onInit: function () {

                // Datos de prueba para desarrollar el frontend.
                var oModel = new JSONModel({
                    showDetails: false,
                    selectedDateTitle: "",
                    selectedDateTotal: 0,
                    selectedActivities: [],

                    activities: [
                        {
                            fecha: "2026-09-05",
                            cliente: "Cliente A",
                            proyecto: "Desarrollo web",
                            descripcion: "Corrección de errores",
                            horas: 3
                        },
                        {
                            fecha: "2026-09-05",
                            cliente: "Cliente B",
                            proyecto: "Soporte",
                            descripcion: "Revisión de incidencias",
                            horas: 2.5
                        },
                        {
                            fecha: "2026-09-11",
                            cliente: "Cliente A",
                            proyecto: "Desarrollo web",
                            descripcion: "Pruebas de funcionalidad",
                            horas: 5.5
                        }
                    ]
                });

                this.getView().setModel(oModel, "calendarModel");
                this._crearCalendario();
            },

            _crearCalendario: function () {
                var oCalendar = this.byId("calendarGrid");
                oCalendar.removeAllItems();
                var iYear = 2026;
                var iMonth = 8;
                var oFirstDay = new Date(iYear, iMonth, 1);

                var iDaysInMonth =
                    new Date(iYear, iMonth + 1, 0).getDate();
                
                var iStartDay = oFirstDay.getDay();
                if (iStartDay === 0) {
                    iStartDay = 6;
                } else {
                    iStartDay = iStartDay - 1;
                }
                for (var i = 0; i < iStartDay; i++) {
                    var oEmptyDay = new VBox({
                        height: "70px"
                    });
                    oEmptyDay.addStyleClass("calendarDay");
                    oEmptyDay.addStyleClass("emptyDay");
                    oCalendar.addItem(oEmptyDay);
                }

                // Obtener las actividades del modelo.
                var oModel = this.getView().getModel("calendarModel");
                var aActivities = oModel.getProperty("/activities") || [];

                for (let iDay = 1; iDay <= iDaysInMonth; iDay++) {
                    var oDay = new VBox({
                        height: "70px"
                    });
                    oDay.addStyleClass("calendarDay");
                    var oNumber = new Text({
                        text: String(iDay)
                    });
                    oNumber.addStyleClass("dayNumber");
                    oDay.addItem(oNumber);

                    let sDate =
                        iYear + "-" +
                        String(iMonth + 1).padStart(2, "0") + "-" +
                        String(iDay).padStart(2, "0");

                    // Buscar actividades de la fecha.
                    var aDayActivities = aActivities.filter(
                        function (oActivity) {
                            return oActivity.fecha === sDate;
                        }
                    );
                    if (aDayActivities.length > 0) {
                        var nHours = aDayActivities.reduce(
                            function (nTotal, oActivity) {
                                return nTotal + Number(oActivity.horas || 0);
                            },
                            0
                        );

                        oDay.addStyleClass("completedDay");
                        var oStatus = new Text({
                            text: "●"
                        });
                        oStatus.addStyleClass("grandeCirculo");
                        oStatus.addStyleClass("dayStatus");
                        oDay.addItem(oStatus);
                        var oHours = new Text({
                            text: nHours + " h"
                        });
                        oHours.addStyleClass("dayHours");
                        oDay.addItem(oHours);
                    }

                    // Marca visual de prueba del día 11.
                    if (iDay === 11) {
                        oDay.addStyleClass("currentDay");
                    }
                    oDay.setTooltip(
                        "Consultar actividades del " + iDay
                    );
                    oDay.addStyleClass("selectableDay");
                    oDay.attachBrowserEvent(
                        "click",
                        function () {
                            this._mostrarActividades(sDate);
                        }.bind(this)
                    );
                    oCalendar.addItem(oDay);
                }
            },

            _mostrarActividades: function (sDate) {
                var oModel = this.getView().getModel("calendarModel");
                var aActivities = oModel.getProperty("/activities") || [];
                // Buscar las actividades de la fecha seleccionada.
                var aSelectedActivities = aActivities.filter(
                    function (oActivity) {
                        return oActivity.fecha === sDate;
                    }
                );
                oModel.setProperty(
                    "/selectedActivities",
                    aSelectedActivities
                );
                var nTotalHours = aSelectedActivities.reduce(
                    function (nTotal, oActivity) {
                        return nTotal + Number(oActivity.horas || 0);
                    },
                    0
                );
                var aParts = sDate.split("-");
                var sDateTitle =
                    "Actividades registradas del " +
                    aParts[2] + "/" +
                    aParts[1] + "/" +
                    aParts[0];
                oModel.setProperty(
                    "/selectedDateTitle",
                    sDateTitle
                );

                oModel.setProperty(
                    "/selectedDateTotal",
                    nTotalHours
                );
                
                oModel.setProperty("/showDetails", true);
            },

            onCerrarDetalle: function () {
                this.getView()
                    .getModel("calendarModel")
                    .setProperty("/showDetails", false);
            },

            onExportExcel: function () {
                var oModel = this.getView().getModel("calendarModel");
                var aActivities = oModel.getProperty("/activities") || [];
                if (aActivities.length === 0) {
                    sap.m.MessageToast.show("No hay actividades para exportar.");
                    return;
                }
                var aExportData = aActivities.map(function (oActivity) {
                    var aDate = oActivity.fecha.split("-");
                    return {
                        fecha: aDate[2] + "/" + aDate[1] + "/" + aDate[0],
                        cliente: oActivity.cliente,
                        proyecto: oActivity.proyecto,
                        descripcion: oActivity.descripcion,
                        horas: Number(oActivity.horas || 0)
                    };
                });

                // Definir las columnas del archivo Excel.
                var oSettings = {
                    workbook: {
                        columns: [
                            {
                                label: "Fecha",
                                property: "fecha",
                                type: "String"
                            },
                            {
                                label: "Cliente",
                                property: "cliente",
                                type: "String"
                            },
                            {
                                label: "Proyecto",
                                property: "proyecto",
                                type: "String"
                            },
                            {
                                label: "Actividad",
                                property: "descripcion",
                                type: "String"
                            },
                            {
                                label: "Horas",
                                property: "horas",
                                type: "Number"
                            }
                        ],
                        context: {
                            sheetName: "Actividades",
                            title: "Reporte mensual de actividades"
                        }
                    },

                    dataSource: aExportData,
                    fileName: "Actividades_Septiembre_2026"
                };

                var oSpreadsheet = new Spreadsheet(oSettings);

                oSpreadsheet.build()
                    .then(function () {
                        sap.m.MessageToast.show(
                            "La exportación ha finalizado."
                        );
                    })
                    .catch(function (oError) {
                        console.error("Error al exportar Excel:", oError);

                        sap.m.MessageToast.show(
                            "No se pudo generar el archivo Excel."
                        );
                    })
                    .finally(function () {
                        oSpreadsheet.destroy();
                    });
            },


            onPressVerReporte: function () {
                var oRouter = UIComponent.getRouterFor(this);
                oRouter.navTo("RouteReporteMensual");
            },

            onPressVerUsuarios: function () {
                var oRouter = UIComponent.getRouterFor(this);
                oRouter.navTo("RoutePerfiles");
            }
	});
});