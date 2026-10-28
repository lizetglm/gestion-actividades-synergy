sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet", 
    "sap/ui/export/library"
], function(
	Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, Spreadsheet, exportLibrary
) {
	"use strict";
    const EdmType = exportLibrary.EdmType;

	return Controller.extend("ns.frontend.controller.admin.ClientesProyectos", {
		onInit: function () {
            // Inicializa el modelo local para controlar las 3 columnas
            var oViewModel = new JSONModel({ 
                layout: "OneColumn" 
            });
            this.getView().setModel(oViewModel, "fclModel");

            // INYECTAR MOCK DATA DIRECTAMENTE (Para saltarse el manifest)
            var oMockData = {
                "clientes": [
                    {
                        "idCliente": "CLI-001",
                        "nombre": "Alpha S.A. de C.V.",
                        "estatus": "Activo",
                        "totalProyectos": 4,
                        "proyectos": [
                            {
                                "idProyecto": "PROJ-101",
                                "nombreProyecto": "Implementación SAP BTP",
                                "descripcion": "Migración de servicios cloud",
                                "fechaInicio": "2026-01-15",
                                "fechaFin": "2026-11-30",
                                "estatusProyecto": "En Progreso",
                                "requerimientos": [
                                    { "idRequerimiento": "REQ-001", "nombre": "Configuración BTP", "descripcion": "Configuración de entornos", "estatus": "Activo", "tipo": "RF" },
                                    { "idRequerimiento": "REQ-002", "nombre": "Migración BD", "descripcion": "Migración de datos a HANA", "estatus": "Inactivo", "tipo": "RF" }
                                ],
                                "consultores": [
                                    { "nombreConsultor": "Juan Pérez", "rol": "Arquitecto Cloud" },
                                    { "nombreConsultor": "María González", "rol": "Desarrolladora ABAP RAP / Fiori" },
                                    { "nombreConsultor": "Carlos Ramírez", "rol": "Especialista en Integración" }
                                ]
                            },
                            {
                                "idProyecto": "PROJ-102",
                                "nombreProyecto": "Desarrollo de Aplicación Móvil",
                                "descripcion": "Aplicación para gestión de inventarios",
                                "fechaInicio": "2026-03-01",
                                "fechaFin": "2026-08-15",
                                "estatusProyecto": "Completado",
                                "requerimientos": [
                                    { "idRequerimiento": "REQ-004", "nombre": "UI/UX", "descripcion": "Diseño de interfaz", "estatus": "Activo", "tipo": "RF" }
                                ],
                                "consultores": [
                                    { "nombreConsultor": "Lizet López", "rol": "Desarrolladora ABAP RAP / Fiori" },
                                    { "nombreConsultor": "Chelsea Garcia Telles", "rol": "Desarrolladora ABAP RAP / Fiori" },
                                    { "nombreConsultor": "Juan Pérez", "rol": "Desarrollador Mobile" },
                                    { "nombreConsultor": "María González", "rol": "Diseñadora UI/UX" },
                                    { "nombreConsultor": "Carlos Ramírez", "rol": "Arquitecto Cloud" },
                                    { "nombreConsultor": "Ana Martínez", "rol": "QA Tester" },
                                    { "nombreConsultor": "Luis Rodríguez", "rol": "Especialista en Integración" }
                                ]
                            }
                        ]
                    },
                    {
                        "idCliente": "CLI-002",
                        "nombre": "Beta Tech Solutions",
                        "estatus": "Activo",
                        "totalProyectos": 2,
                        "proyectos": [
                            {
                                "idProyecto": "PROJ-201",
                                "nombreProyecto": "Integración de Sistemas",
                                "descripcion": "Integración de sistemas internos con SAP",
                                "fechaInicio": "2026-02-10",
                                "fechaFin": "2026-09-20",
                                "estatusProyecto": "En Progreso",
                                "requerimientos": [
                                    { "idRequerimiento": "REQ-006", "nombre": "API Gateway", "descripcion": "Implementación de API Gateway", "estatus": "Activo", "tipo": "RF" }
                                ],
                                "consultores": [
                                    { "nombreConsultor": "Ana Martínez", "rol": "QA Tester" },
                                    { "nombreConsultor": "Luis Rodríguez", "rol": "Especialista en Integración" }
                                ]
                            }
                        ]
                    }
                ]
            };
            var oMockModel = new JSONModel(oMockData);
            // Al setearlo con el nombre "mock" en la vista principal, las 3 columnas lo pueden usar
            this.getView().setModel(oMockModel, "mock");
            
            // 3. Inicializar el Router
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteClientesProyectos").attachMatched(this._onRouteMatched, this);
            oRouter.getRoute("RouteProyectos").attachMatched(this._onRouteMatched, this);
            oRouter.getRoute("RouteRequerimientos").attachMatched(this._onRouteMatched, this);
        },
        
        _onRouteMatched: function (oEvent) {
            var sRouteName = oEvent.getParameter("name");
            var oModel = this.getView().getModel("fclModel");
            
            // Cambia dinámicamente el layout dependiendo de la ruta en la que estemos
            if (sRouteName === "RouteClientesProyectos") {
                oModel.setProperty("/layout", "OneColumn");
            } else if (sRouteName === "RouteProyectos") {
                oModel.setProperty("/layout", "TwoColumnsBeginExpanded");
            } else if (sRouteName === "RouteRequerimientos") {
                oModel.setProperty("/layout", "ThreeColumnsMidExpanded");
            }
        }
	});
});