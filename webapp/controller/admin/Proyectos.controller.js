sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/export/Spreadsheet", 
    "sap/ui/export/library",
    "ns/frontend/util/ExportHelper"
], function (
    Controller, JSONModel, MessageToast, MessageBox, Fragment, 
    Spreadsheet, exportLibrary, ExportHelper
) {
    "use strict";
    const EdmType = exportLibrary.EdmType;

	return Controller.extend("ns.frontend.controller.admin.Proyectos", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("RouteProyectos").attachPatternMatched(this._onRouteMatched, this);
            this.getOwnerComponent().getRouter().getRoute("RouteRequerimientos").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            this._sClientUuid = oEvent.getParameter("arguments").clientUuid;
            
            // Enlazamos la vista al cliente usando su ruta de OData V4 por clave única
            this.getView().bindElement({
                path: "/Clientes(ClientUuid=" + this._sClientUuid + ")",
                parameters: {
                    $expand: "_Proyectos" // Expandimos la composición de proyectos del backend RAP
                }
            });
        },

        onExportarProyectosExcel: function () {
            let aCols = [
                { label: 'ID Proyecto', property: 'idProyecto', type: EdmType.String },
                { label: 'Nombre del Proyecto', property: 'nombreProyecto', type: EdmType.String },
                { label: 'Descripción', property: 'descripcion', type: EdmType.String },
                { label: 'Estatus', property: 'estatusProyecto', type: EdmType.String }
            ];

            let oRowBinding = this.byId("tablaProyectosDetalle").getBinding("items");
			let sNombreArchivo = ExportHelper.generarNombreArchivoConFecha("Portafolio_Proyectos");
            let oSettings = {
                workbook: { columns: aCols },
                dataSource: oRowBinding,
                fileName: sNombreArchivo, 
                worker: false
            };

            let oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(() => oSheet.destroy());
        },

        // navegacion a columna 3
        onSelectProyecto: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
            var sProjectUuid = oContext.getProperty("ProjectUuid");
            
            this.getOwnerComponent().getRouter().navTo("RouteRequerimientos", {
                clientUuid: this._sClientUuid,
                projectUuid: sProjectUuid
            });
        },

        onCloseColumn: function () {
            this.getOwnerComponent().getRouter().navTo("RouteClientesProyectos");
        },


        // CRUD ----------------------------------------------------
        _abrirDialogo: async function (oContext, sTitulo) {
            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "ns.frontend.fragment.DialogProyecto",
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

        onCerrarDialogProyecto: async function () {
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
            Fragment.byId(this.getView().getId(), "inpNombre")?.setValueState("None");
            Fragment.byId(this.getView().getId(), "inpDescripcion")?.setValueState("None");
            Fragment.byId(this.getView().getId(), "inpFechaInicio")?.setValueState("None");
            Fragment.byId(this.getView().getId(), "inpFechaFin")?.setValueState("None");
            this._oContextDialogo = null;
        },

        // Crear
        onAddProyecto: function () {
            const oListBinding = this.byId("tablaProyectosDetalle").getBinding("items");
    
            const oContext = oListBinding.create({ Activo: true }, true);
            this._abrirDialogo(oContext, "Nuevo Proyecto");
        },

        // Editar
        onEditProyecto: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            this._abrirDialogo(oContext, "Editar Proyecto");
        },

        // Guardar
        onGuardarProyecto: async function () {
            const oModel = this.getView().getModel();
            const oDialog = await this._pDialog;
            const oContext = this._oContextDialogo;

            const oInpNombre = Fragment.byId(this.getView().getId(), "inpNombre");
            const oInpDescripcion = Fragment.byId(this.getView().getId(), "inpDescripcion");
            const oInpFechaInicio = Fragment.byId(this.getView().getId(), "inpFechaInicio");
            const oInpFechaFin = Fragment.byId(this.getView().getId(), "inpFechaFin");

            const sNombre = (oContext.getProperty("Nombre") || "").trim();
            const sDescripcion = (oContext.getProperty("Descripcion") || "").trim();
            const sFechaInicio = oContext.getProperty("FechaInicio");
            const sFechaFin = oContext.getProperty("FechaFin");

            // Validaciones básicas
            if (!sNombre) {
                oInpNombre?.setValueState("Error");
                oInpNombre?.focus();
                oInpNombre?.setValueStateText("El nombre es obligatorio");
                return;
            }oInpNombre?.setValueState("None");

            if (!sDescripcion) {
                oInpDescripcion?.setValueState("Error");
                oInpDescripcion?.focus();
                oInpDescripcion?.setValueStateText("La descripción es obligatoria");
                return;
            }oInpDescripcion?.setValueState("None");

            if (!sFechaInicio) {
                oInpFechaInicio?.setValueState("Error");
                oInpFechaInicio?.focus();
                oInpFechaInicio?.setValueStateText("La fecha de inicio es obligatoria");
                return;
            }oInpFechaInicio?.setValueState("None");

            if (!sFechaFin) {
                oInpFechaFin?.setValueState("Error");
                oInpFechaFin?.focus();
                oInpFechaFin?.setValueStateText("La fecha de fin es obligatoria");
                return;
            }oInpFechaFin?.setValueState("None");
            
            oDialog.setBusy(true);
            try {
                await oModel.submitBatch("grupoDialogo");

                if (oModel.hasPendingChanges("grupoDialogo")) {
                    MessageBox.error("No se pudo guardar. Revisa los datos e intenta de nuevo.");
                } else {
                    MessageToast.show("Proyecto guardado");
                    oDialog.close();
                    this.getView().getElementBinding().refresh();
                }
            } catch (oError) {
                MessageBox.error(oError.message);
            } finally {
                oDialog.setBusy(false);
            }
        },

        // Eliminar
        onInactivarProyecto: function (oEvent) {
            
        }


	});
});