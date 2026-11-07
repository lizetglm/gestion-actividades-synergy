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
            this._sClientUuid = oEvent.getParameter("arguments").clientUuid;
            this._sProjectUuid = oEvent.getParameter("arguments").projectUuid;
            
            // Enlazamos la vista directamente al proyecto específico usando su UUID en OData V4
            this.getView().bindElement({
                path: "/Proyectos(ProjectUuid=" + this._sProjectUuid + ")",
                parameters: {
                    $expand: "_Requerimientos,_Asignaciones"
                }
            });
        },

        onCloseColumn: function () {
            this.getOwnerComponent().getRouter().navTo("RouteProyectos", {
                clientUuid: this._sClientUuid
            });
        },

        onExportarReqExcel: function() {
            let aCols = [
                { label: 'ID Requerimiento', property: 'idRequerimiento', type: EdmType.String },
                { label: 'Descripción', property: 'descripcion', type: EdmType.String }
            ];
            
            let oRowBinding = this.byId("tablaRequerimientos").getBinding("items");
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
        _abrirDialogoReq: async function (oContext, sTitulo) {
            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "ns.frontend.fragment.DialogRequerimiento",
                    controller: this
                }).then((oDialog) => {
                    oDialog.setBindingContext(null);
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            const oDialog = await this._pDialog;
            this._oContextDialogo = oContext;
            oDialog.setTitle(sTitulo);
            oDialog.setBindingContext(oContext);
            oDialog.open();
        },

        onCerrarDialogoReq: async function () {
            (await this._pDialog).close();
        },

        _descartarCambios: function () {
            const oModel = this.getView().getModel();
            const oContext = this._oContextDialogo;

            if (oContext && oContext.isTransient()) {
                oContext.created()?.catch(() => {}); 
                oContext.delete().catch(() => {});
            }
            if (oModel.hasPendingChanges("grupDialog")) {
                oModel.resetChanges("grupDialog");
            }
        },

        onAfterCloseDialogo: async function () {
            const oDialog = await this._pDialog;

            this._descartarCambios();

            oDialog.setBindingContext(null);
            Fragment.byId(this.getView().getId(), "inpDescReq")?.setValueState("None");
            this._oContextDialogo = null;
        },

        
        onAddRequerimiento: function (oEvent) {
            const oListBinding = this.byId("tablaRequerimientos").getBinding("items");
    
            const oContext = oListBinding.create({}, true);
            this._abrirDialogoReq(oContext, "Nuevo Requerimiento");
        },

        onEditRequerimiento: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            this._abrirDialogoReq(oContext, "Editar Requerimiento");
        },

        onGuardarRequerimiento: async function () {
            const oModel = this.getView().getModel();
            const oDialog = await this._pDialog;
            const oContext = this._oContextDialogo;

            const oInpDescripcion = Fragment.byId(this.getView().getId(), "inpDescReq");

            const sDescripcion = (oContext.getProperty("Descripcion") || "").trim();

            // Validaciones básicas
            if (!sDescripcion) {
                oInpDescripcion?.setValueState("Error");
                oInpDescripcion?.focus();
                oInpDescripcion?.setValueStateText("La descripción es obligatoria");
                return;
            }oInpDescripcion?.setValueState("None");

            
            oDialog.setBusy(true);
            try {
                await oModel.submitBatch("grupoDialogo");

                if (oModel.hasPendingChanges("grupoDialogo")) {
                    MessageBox.error("No se pudo guardar. Revisa los datos e intenta de nuevo.");
                } else {
                    MessageToast.show("Requerimiento guardado");
                    oDialog.close();
                    this.getView().getElementBinding().refresh();
                }
            } catch (oError) {
                MessageBox.error(oError.message);
            } finally {
                oDialog.setBusy(false);
            }
        },

        onDeleteRequerimiento: function (oEvent) {
            
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