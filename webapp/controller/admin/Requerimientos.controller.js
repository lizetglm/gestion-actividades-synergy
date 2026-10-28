sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet", 
    "sap/ui/export/library",
    "sap/ui/core/Fragment",
    "ns/frontend/util/ExportHelper"
], function(
	Controller, JSONModel, MessageToast, MessageBox,
    Spreadsheet, exportLibrary,Fragment, ExportHelper
) {
	"use strict";
    const EdmType = exportLibrary.EdmType;

	return Controller.extend("ns.frontend.controller.admin.Requerimientos", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteRequerimientos").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function (oEvent) {
            this._sClientIndex = oEvent.getParameter("arguments").clientIndex;
            this._sProjectIndex = oEvent.getParameter("arguments").projectIndex;
            
            // Conectamos la vista al proyecto exacto (ej: /clientes/0/proyectos/1)
            this.getView().bindElement({
                path: "/clientes/" + this._sClientIndex + "/proyectos/" + this._sProjectIndex,
                model: "mock"
            });
        },
        onCloseColumn: function () {
            this.getOwnerComponent().getRouter().navTo("RouteProyectos", {
                clientIndex: this._sClientIndex
            });
        },

        onExportarReqExcel: function() {
            let aCols = [
                { label: 'ID Requerimiento', property: 'idRequerimiento', type: EdmType.String },
                { label: 'Descripción', property: 'descripcion', type: EdmType.String }
            ];
            
            let oRowBinding = this.byId("tablaReqFuncionales").getBinding("items");
			let sNombreArchivo = ExportHelper.generarNombreArchivoConFecha("Requerimientos_Proyecto");
            let oSettings = {
                workbook: { columns: aCols },
                dataSource: oRowBinding,
                fileName: sNombreArchivo, 
                worker: false
            };

            new Spreadsheet(oSettings).build().finally(function() {
                this.destroy(); 
            });
        },

        onExportarConsultoresExcel: function() {
            let aCols = [
                { label: 'Nombre del Consultor', property: 'nombreConsultor', type: EdmType.String },
                { label: 'Rol Asignado', property: 'rol', type: EdmType.String }
            ];
            
            let oRowBinding = this.byId("tablaConsultoresDetalle").getBinding("items");
            let sNombreArchivo = ExportHelper.generarNombreArchivoConFecha("Consultores_Proyecto");
            let oSettings = {
                workbook: { columns: aCols },
                dataSource: oRowBinding,
                fileName: sNombreArchivo, 
                worker: false
            };

            new Spreadsheet(oSettings).build().finally(function() {
                this.destroy(); 
            });
        },


        // CRUD REQUERIMIENTOS ----------------------
        onAddRequerimiento: function (oEvent) {
            this._bReqEdicion = false;
            let oDatosNuevoReq = { 
                idRequerimiento: "", 
                descripcion: "", 
                estatus: "Activo"
            };
            this._abrirDialogoReq(oDatosNuevoReq);
        },

        onEditRequerimiento: function (oEvent) {
            this._bReqEdicion = true;
            let oItem = oEvent.getSource();
            this._sReqEditPath = oItem.getBindingContext("mock").getPath();
            let oDatosReq = JSON.parse(JSON.stringify(oItem.getBindingContext("mock").getObject()));
            this._abrirDialogoReq(oDatosReq);
        },

        _abrirDialogoReq: function (oDatos) {
            let oView = this.getView();
            let oDialogModel = new JSONModel(oDatos);

            if (!this._oDialogRequerimiento) {
                Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.DialogRequerimiento",
                    controller: this
                }).then(function (oDialog) {
                    this._oDialogRequerimiento = oDialog;
                    oView.addDependent(this._oDialogRequerimiento);
                    this._oDialogRequerimiento.setModel(oDialogModel, "nuevoReq");
                    this._oDialogRequerimiento.open();
                }.bind(this));
            } else {
                this._oDialogRequerimiento.setModel(oDialogModel, "nuevoReq");
                this._oDialogRequerimiento.open();
            }
        },

        onCerrarDialogoReq: function () {
            if (this._oDialogRequerimiento) {
                this._oDialogRequerimiento.close();
            }
        },

        onGuardarRequerimiento: function () {
            let oDatosReq = this._oDialogRequerimiento.getModel("nuevoReq").getData();
            let oModelMain = this.getView().getModel("mock");

            if (!oDatosReq.idRequerimiento || !oDatosReq.descripcion) {
                MessageBox.warning("Por favor, llena todos los campos obligatorios.");
                return;
            }

            if (this._bReqEdicion) {
                oModelMain.setProperty(this._sReqEditPath, oDatosReq);
                MessageToast.show("Requerimiento actualizado.");
            } else {
                let sPathReqs = "/clientes/" + this._sClientIndex + "/proyectos/" + this._sProjectIndex + "/requerimientos";
                let aReqs = oModelMain.getProperty(sPathReqs) || [];
                aReqs.push(oDatosReq);
                oModelMain.setProperty(sPathReqs, aReqs);
                MessageToast.show("Requerimiento agregado exitosamente.");
            }
            this.onCerrarDialogoReq();
        },

        onDeleteRequerimiento: function (oEvent) {
            let oContext = oEvent.getSource().getBindingContext("mock");
            let sPath = oContext.getPath();

            MessageBox.confirm("¿Estás seguro de que deseas eliminar este requerimiento?", {
                title: "Confirmar Eliminación",
                icon: MessageBox.Icon.WARNING,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        let oModel = this.getView().getModel("mock");
                        let aPathParts = sPath.split("/");
                        let iIndex = parseInt(aPathParts.pop(), 10);
                        aPathParts.pop(); // quitar 'requerimientos'
                        let sPathPadre = aPathParts.join("/") + "/requerimientos";

                        let aReqs = oModel.getProperty(sPathPadre);
                        aReqs.splice(iIndex, 1);
                        oModel.setProperty(sPathPadre, aReqs);
                        MessageToast.show("Requerimiento eliminado.");
                    }
                }.bind(this)
            });
        },

        // CRUD CONSULTORES -----------------------------
        onAsignarConsultor: function () {
            let oView = this.getView();
            // Obtenemos el ID del proyecto actual para pre-llenar el diálogo
            let oProyectoActual = oView.getModel("mock").getProperty("/clientes/" + this._sClientIndex + "/proyectos/" + this._sProjectIndex);
            
            let oDatosNuevoConsultor = {
                nombreConsultor: "",
                proyectoAsignado: oProyectoActual.idProyecto, // Pre-asignado
                rol: ""
            };
            let oDialogModel = new JSONModel(oDatosNuevoConsultor);

            if (!this._oDialogConsultor) {
                Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.DialogConsultor", 
                    controller: this
                }).then(function (oDialog) {
                    this._oDialogConsultor = oDialog;
                    oView.addDependent(this._oDialogConsultor);
                    this._oDialogConsultor.setModel(oDialogModel, "nuevoConsultor");
                    this._oDialogConsultor.open();
                }.bind(this));
            } else {
                this._oDialogConsultor.setModel(oDialogModel, "nuevoConsultor");
                this._oDialogConsultor.open();
            }
        },

        onCerrarDialogConsultor: function () {
            if (this._oDialogConsultor) {
                this._oDialogConsultor.close();
            }
        },

        onGuardarConsultorMock: function () {
            let oDatosConsultor = this._oDialogConsultor.getModel("nuevoConsultor").getData();
            let oModelMain = this.getView().getModel("mock");
            
            // Validamos que no vengan vacíos
            if (!oDatosConsultor.nombreConsultor || !oDatosConsultor.rol) {
                MessageBox.warning("Por favor, selecciona el consultor y su rol.");
                return;
            }
            
            // CORRECCIÓN: La ruta ahora es directamente dentro del proyecto seleccionado
            let sPathConsultores = "/clientes/" + this._sClientIndex + "/proyectos/" + this._sProjectIndex + "/consultores";
            let aConsultores = oModelMain.getProperty(sPathConsultores) || [];
            
            // Insertamos al nuevo consultor
            aConsultores.push({
                nombreConsultor: oDatosConsultor.nombreConsultor,
                rol: oDatosConsultor.rol
            });
            
            oModelMain.setProperty(sPathConsultores, aConsultores);

            MessageToast.show("Consultor asignado exitosamente al proyecto.");
            this.onCerrarDialogConsultor();
        },

        onInactivarConsultor: function(oEvent) {
            let oContext = oEvent.getSource().getBindingContext("mock");
            let sPath = oContext.getPath();
            let oDatosFila = oContext.getObject(); 

            let sMensaje = "¿Seguro que deseas remover al consultor " + oDatosFila.nombreConsultor + " del proyecto?";

            MessageBox.confirm(sMensaje, {
                title: "Remover Consultor",
                icon: MessageBox.Icon.WARNING,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        let oModel = this.getView().getModel("mock");
                        let aPathParts = sPath.split("/");
                        let iIndex = parseInt(aPathParts.pop(), 10);
                        aPathParts.pop(); 
                        let sPathPadre = aPathParts.join("/") + "/consultores";

                        let aConsultores = oModel.getProperty(sPathPadre);
                        aConsultores.splice(iIndex, 1);
                        oModel.setProperty(sPathPadre, aConsultores);
                        
                        this.byId("tablaConsultoresDetalle").getBinding("items").refresh();
                        MessageToast.show("Simulación: Consultor removido exitosamente.");
                    }
                }.bind(this)
            });
        }
	});
});