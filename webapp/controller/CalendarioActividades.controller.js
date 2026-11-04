sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/VBox",
    "sap/m/Text",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/UIComponent",
    "sap/ui/export/Spreadsheet"
], function (Controller, VBox, Text, JSONModel, UIComponent, Spreadsheet) {
    "use strict";

    return Controller.extend(
         "ns.frontend.controller.CalendarioActividades",
        {
            onInit: function () {
                this._iYear = 2026;
                this._iMonth = 8; 

                this._actualizarTituloMes();

                var oModel = new JSONModel({
                    monthTitle: this._sMonthTitle,

                    showDetails: false,
                    selectedDateTitle: "",
                    selectedDateTotal: 0,
                    selectedActivities: [],

                    kpi: {
                        horasTexto: "0 h",
                        diasTexto: "0 / 0",
                        pendientesTexto: "0",
                        estadoReporte: "Pendiente"
                    },

                    activities: []
                });

                this.getView().setModel(oModel, "calendarModel");

                var oFilterModel = new JSONModel({
                    clienteSeleccionado: "Todos",
                    proyectoSeleccionado: "Todos",
                    clientes: [],
                    proyectos: []
                });

                this.getView().setModel(oFilterModel, "filterModel");

                //this._cargarActividadesMock();
                this._cargarActividadesOData();
            },

            
            _cargarActividadesOData: async function () {
                var oCalendarModel = this.getView().getModel("calendarModel");
                var oODataModel = this.getOwnerComponent().getModel("actividadesOData");

                if (!oODataModel) {
                    console.error("No se encontró el modelo actividadesOData.");
                    return;
                }

                try {
                    var oBindingActividades = oODataModel.bindList("/RegistrosActividad");
                    var oBindingClientes = oODataModel.bindList("/Clientes");
                    var oBindingProyectos = oODataModel.bindList("/Proyectos");

                    var aResultados = await Promise.all([
                        oBindingActividades.requestContexts(0, 100),
                        oBindingClientes.requestContexts(0, 100),
                        oBindingProyectos.requestContexts(0, 100)
                    ]);

                    var aRegistros = aResultados[0].map(function (oContext) {
                        return oContext.getObject();
                    });

                    var aClientes = aResultados[1].map(function (oContext) {
                        return oContext.getObject();
                    });

                    var aProyectos = aResultados[2].map(function (oContext) {
                        return oContext.getObject();
                    });

                    console.log("Actividades SAP:", aRegistros);
                    console.log("Clientes SAP:", aClientes);
                    console.log("Proyectos SAP:", aProyectos);

                    var mClientes = {};
                    var mProyectos = {};

                    aClientes.forEach(function (oCliente) {
                        mClientes[oCliente.ClientUuid] = oCliente.Nombre;
                    });

                    aProyectos.forEach(function (oProyecto) {
                        mProyectos[oProyecto.ProjectUuid] = oProyecto.Nombre;
                    });

                    var aActivities = aRegistros.map(function (oRegistro) {
                        return {
                            registroUuid: oRegistro.RegistroUuid,
                            consultorUuid: oRegistro.ConsultorUuid,
                            clientUuid: oRegistro.ClientUuid,
                            projectUuid: oRegistro.ProjectUuid,

                            fecha: oRegistro.Fecha,
                            horas: Number(oRegistro.Horas),
                            descripcion: oRegistro.Descripcion,

                            cliente: mClientes[oRegistro.ClientUuid] || "Cliente desconocido",
                            proyecto: mProyectos[oRegistro.ProjectUuid] || "Proyecto desconocido"
                        };
                    });

                    oCalendarModel.setProperty("/activities", aActivities);

                    this._cargarOpcionesFiltros();
                    this._crearCalendario();

                    console.log("Calendario actualizado con nombres reales:", aActivities);

                } catch (oError) {
                    console.error("Error al consultar datos SAP:", oError);
                }
            },

            
            _calcularEstatusReporteMensual: function () {
                var aActivities =
                    this.getView().getModel("calendarModel")
                        .getProperty("/activities") || [];

                var iYear = this._iYear;
                var iMonth = this._iMonth;
                var oHoy = new Date();

                var iDiasMes = new Date(
                    iYear, iMonth + 1, 0
                ).getDate();

                var iDiasEvaluados = 0;
                var iDiasCompletos = 0;
                var iDiasPendientes = 0;

                for (var iDia = 1; iDia <= iDiasMes; iDia++) {

                    var oFecha = new Date(iYear, iMonth, iDia);
                    var iDiaSemana = oFecha.getDay();

                    if (iDiaSemana === 0 || iDiaSemana === 6) {
                        continue;
                    }

                    if (oFecha > oHoy) {
                        continue;
                    }

                    var sFecha = [
                        iYear,
                        String(iMonth + 1).padStart(2, "0"),
                        String(iDia).padStart(2, "0")
                    ].join("-");

                    var nHoras = aActivities
                        .filter(function (oActividad) {
                            return oActividad.fecha === sFecha;
                        })
                        .reduce(function (nTotal, oActividad) {
                            return nTotal + Number(oActividad.horas || 0);
                        }, 0);

                    iDiasEvaluados++;

                    if (nHoras >= 8) {
                        iDiasCompletos++;
                    } else {
                        iDiasPendientes++;
                    }
                }

                var oFinMes = new Date(
                    iYear, iMonth + 1, 0, 23, 59, 59
                );

                var sEstatus;
                var sEstadoUI5;

                if (iDiasEvaluados === 0) {
                    sEstatus = "Sin evaluar";
                    sEstadoUI5 = "None";

                } else if (iDiasPendientes > 0) {
                    sEstatus = "Pendiente";
                    sEstadoUI5 = "Error";

                } else if (oHoy > oFinMes) {
                    sEstatus = "Listo para revisión";
                    sEstadoUI5 = "Success";

                } else {
                    sEstatus = "Completo";
                    sEstadoUI5 = "Success";
                }

                return {
                    estatus: sEstatus,
                    estadoUI5: sEstadoUI5,
                    diasEvaluados: iDiasEvaluados,
                    diasCompletos: iDiasCompletos,
                    diasPendientes: iDiasPendientes
                };
            },

            
            _cargarActividadesMock: function () {
                var oCalendarModel = this.getView().getModel("calendarModel");
                var sUrl = sap.ui.require.toUrl(
                    "ns/frontend/model/activities.json"
                );

                console.log("Buscando actividades en:", sUrl);

                var oMockModel = new JSONModel();

                oMockModel.attachRequestCompleted(function (oEvent) {
                    if (!oEvent.getParameter("success")) {
                        console.error("No se pudieron cargar las actividades.");
                        return;
                    }

                    var aActivities = oMockModel.getProperty("/activities") || [];

                    console.log("Actividades encontradas:", aActivities);

                    oCalendarModel.setProperty("/activities", aActivities);

                    this._cargarOpcionesFiltros();
                    this._crearCalendario();

                }.bind(this));

                oMockModel.attachRequestFailed(function (oEvent) {
                    console.error(
                        "Error al cargar activities.json:",
                        oEvent.getParameters()
                    );
                });

                oMockModel.loadData(sUrl);
            },




            _actualizarTituloMes: function () {

                var oFecha = new Date(
                    this._iYear,
                    this._iMonth,
                    1
                );

                var sTitulo = new Intl.DateTimeFormat("es-MX", {
                    month: "long",
                    year: "numeric"
                }).format(oFecha);

                this._sMonthTitle =
                    sTitulo.charAt(0).toUpperCase() +
                    sTitulo.slice(1);

                var oModel = this.getView().getModel("calendarModel");

                if (oModel) {
                    oModel.setProperty(
                        "/monthTitle",
                        this._sMonthTitle
                    );
                }
            },

            onMesAnterior: function () {

                var oFecha = new Date(
                    this._iYear,
                    this._iMonth - 1,
                    1
                );

                this._iYear = oFecha.getFullYear();
                this._iMonth = oFecha.getMonth();

                this._actualizarTituloMes();
                this._crearCalendario();

                this.onCerrarDetalle();
            },

            onMesSiguiente: function () {

                var oFecha = new Date(
                    this._iYear,
                    this._iMonth + 1,
                    1
                );

                this._iYear = oFecha.getFullYear();
                this._iMonth = oFecha.getMonth();

                this._actualizarTituloMes();
                this._crearCalendario();

                this.onCerrarDetalle();
            },

            _obtenerEstadoDia: function (oFecha, nHoras, oHoy) {

                if (nHoras >= 8) {
                    return "completo";
                }

                if (nHoras > 0) {
                    return "incompleto";
                }

                return "sinRegistro";
            },

            _actualizarKpis: function () {

                var oModel = this.getView().getModel("calendarModel");
                var aActivities = oModel.getProperty("/activities") || [];

                var iYear = this._iYear;
                var iMonth = this._iMonth;

                var iDiasMes = new Date(
                    iYear,
                    iMonth + 1,
                    0
                ).getDate();

                var oHoy = new Date();

                var nHorasMes = 0;
                var iCompletos = 0;
                var iPendientes = 0;
                var iLaborablesTranscurridos = 0;
                var oReporte = this._calcularEstatusReporteMensual();

                this.getView().getModel("calendarModel").setProperty(
                    "/reporteMensual",
                    oReporte
                );
                oModel.setProperty(
                    "/kpi/estadoReporte",
                    oReporte.estatus
                );

                for (var iDia = 1; iDia <= iDiasMes; iDia++) {

                    var oFecha = new Date(iYear, iMonth, iDia);

                    var sFecha =
                        iYear + "-" +
                        String(iMonth + 1).padStart(2, "0") + "-" +
                        String(iDia).padStart(2, "0");

                    var aActividadesDia = aActivities.filter(
                        function (oActividad) {
                            return oActividad.fecha === sFecha;
                        }
                    );

                    var nHorasDia = aActividadesDia.reduce(
                        function (nTotal, oActividad) {
                            return nTotal + Number(oActividad.horas || 0);
                        },
                        0
                    );

                    nHorasMes += nHorasDia;

                    var sEstado = this._obtenerEstadoDia(
                        oFecha,
                        nHorasDia,
                        oHoy
                    );

                    var oHoySinHora = new Date(
                        oHoy.getFullYear(),
                        oHoy.getMonth(),
                        oHoy.getDate()
                    );

                    var bTranscurrido = oFecha <= oHoySinHora;

                    if (
                        oFecha.getDay() !== 0 &&
                        oFecha.getDay() !== 6 &&
                        bTranscurrido
                    ) {
                        iLaborablesTranscurridos++;

                        if (sEstado === "completo") {
                            iCompletos++;
                        } else {
                            iPendientes++;
                        }
                    }
                }

                oModel.setProperty(
                    "/kpi/horasTexto",
                    Number(nHorasMes.toFixed(2)) + " h"
                );

                oModel.setProperty(
                    "/kpi/diasTexto",
                    iCompletos + " / " + iLaborablesTranscurridos
                );

                oModel.setProperty(
                    "/kpi/pendientesTexto",
                    String(iPendientes)
                );
            },
            

            _obtenerActividadesFiltradas: function () {

                var oModel = this.getView().getModel("calendarModel");
                var oFilterModel = this.getView().getModel("filterModel");

                var aActivities = oModel.getProperty("/activities") || [];

                var sCliente = oFilterModel.getProperty("/clienteSeleccionado");
                var sProyecto = oFilterModel.getProperty("/proyectoSeleccionado");

                return aActivities.filter(function (oActivity) {

                    var bCliente =
                        sCliente === "Todos" ||
                        oActivity.cliente === sCliente;

                    var bProyecto =
                        sProyecto === "Todos" ||
                        oActivity.proyecto === sProyecto;

                    return bCliente && bProyecto;
                });
            },

            onExecuteFilter: function () {

                var oFilterModel = this.getView().getModel("filterModel");

                console.log(
                    "Cliente seleccionado:",
                    oFilterModel.getProperty("/clienteSeleccionado")
                );

                console.log(
                    "Proyecto seleccionado:",
                    oFilterModel.getProperty("/proyectoSeleccionado")
                );

                console.log(
                    "Actividades filtradas:",
                    this._obtenerActividadesFiltradas()
                );

                this._crearCalendario();
                this.onCerrarDetalle();
            },

            _cargarOpcionesFiltros: function () {

                var oModel = this.getView().getModel("calendarModel");
                var oFilterModel = this.getView().getModel("filterModel");

                var aActivities = oModel.getProperty("/activities") || [];

                var aClientes = [...new Set(
                    aActivities.map(function (oActivity) {
                        return oActivity.cliente;
                    }).filter(Boolean)
                )];

                var aProyectos = [...new Set(
                    aActivities.map(function (oActivity) {
                        return oActivity.proyecto;
                    }).filter(Boolean)
                )];

                oFilterModel.setProperty(
                    "/clientes",
                    ["Todos"].concat(aClientes)
                );

                oFilterModel.setProperty(
                    "/proyectos",
                    ["Todos"].concat(aProyectos)
                );
            },
            
            _crearCalendario: function () {

                var oCalendar = this.byId("calendarGrid");
                oCalendar.removeAllItems();

                var iYear = this._iYear;
                var iMonth = this._iMonth;

                var oModel = this.getView().getModel("calendarModel");

                var aActivities = this._obtenerActividadesFiltradas();

                var oHoy = new Date();

                var iDaysInMonth = new Date(
                    iYear,
                    iMonth + 1,
                    0
                ).getDate();

                var iStartDay = (new Date(
                    iYear,
                    iMonth,
                    1
                ).getDay() + 6) % 7;

                for (var i = 0; i < iStartDay; i++) {

                    var oEmptyDay = new VBox({
                        height: "70px"
                    });

                    oEmptyDay.addStyleClass("calendarDay");
                    oEmptyDay.addStyleClass("emptyDay");

                    oCalendar.addItem(oEmptyDay);
                }

                for (let iDay = 1; iDay <= iDaysInMonth; iDay++) {

                    let oFecha = new Date(iYear, iMonth, iDay);

                    let sDate =
                        iYear + "-" +
                        String(iMonth + 1).padStart(2, "0") + "-" +
                        String(iDay).padStart(2, "0");

                    var oDay = new VBox({
                        height: "70px"
                    });

                    oDay.addStyleClass("calendarDay");

                    var oNumber = new Text({
                        text: String(iDay)
                    });

                    oNumber.addStyleClass("dayNumber");
                    oDay.addItem(oNumber);

                    var aDayActivities = aActivities.filter(
                        function (oActivity) {
                            return oActivity.fecha === sDate;
                        }
                    );
                    var nHours = aDayActivities.reduce(
                        function (nTotal, oActivity) {
                            return nTotal + Number(oActivity.horas || 0);
                        },
                        0
                    );

                    var sEstado = this._obtenerEstadoDia(
                        oFecha,
                        nHours,
                        oHoy
                    );
                    

                    if (
                        iDay === oHoy.getDate() &&
                        iMonth === oHoy.getMonth() &&
                        iYear === oHoy.getFullYear()
                    ) {
                        oDay.addStyleClass("currentDay");
                    }
                    var oStatus = new Text({
                        text: "●"
                    });

                    oStatus.addStyleClass("grandeCirculo");
                    oStatus.addStyleClass("dayStatus");

                    if (sEstado === "completo") {

                        oStatus.addStyleClass("statusComplete");

                    } else if (sEstado === "incompleto") {

                        oStatus.addStyleClass("statusIncomplete");

                    } else {

                        oStatus.addStyleClass("statusUnregistered");

                    }

                    oDay.addItem(oStatus);

                    if (nHours > 0) {

                        var oHours = new Text({
                            text: Number(nHours.toFixed(2)) + " h"
                        });

                        oHours.addStyleClass("dayHours");

                        if (nHours < 8) {
                            oHours.addStyleClass("incomplete");
                        }

                        oDay.addItem(oHours);
                    }

                    oDay.setTooltip(
                        sDate + " - " +
                        nHours + " horas - " +
                        sEstado
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

                this._actualizarKpis();
            },


            _mostrarActividades: function (sDate) {
                var oModel = this.getView().getModel("calendarModel");
                var aActivities = this._obtenerActividadesFiltradas();
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
                var iYear = this._iYear;
                var iMonth = this._iMonth;

                var aActivities = this._obtenerActividadesFiltradas().filter(
                    function (oActivity) {

                        var sMonth = iYear + "-" +
                            String(iMonth + 1).padStart(2, "0");

                        return oActivity.fecha.substring(0, 7) === sMonth;
                    }
                );
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
                    fileName: "Actividades_" +
                        new Intl.DateTimeFormat("es-MX", {
                            month: "long"
                        }).format(new Date(this._iYear, this._iMonth, 1))
                        .replace(/^./, function (letra) {
                            return letra.toUpperCase();
                        }) +
                        "_" + this._iYear + ".xlsx"
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
        }
    );
});