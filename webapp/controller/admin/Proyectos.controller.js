sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/export/Spreadsheet", 
    "sap/ui/export/library",
    "ns/frontend/util/ExportHelper",
    "ns/frontend/util/RapHelper"
], function (
    Controller, MessageToast, MessageBox, Fragment, 
    Spreadsheet, exportLibrary, ExportHelper, RapHelper
) {
    "use strict";
    const EdmType = exportLibrary.EdmType;
    const IDS_DIALOGO = ["inpNombre", "inpDescripcion", "inpFechaInicio", "inpFechaFin"];

	return Controller.extend("ns.frontend.controller.admin.Proyectos", {
        onInit: function () {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteProyectos").attachPatternMatched(this._onRouteMatched, this);
            oRouter.getRoute("RouteRequerimientos").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            this._sClientUuid = oEvent.getParameter("arguments").clientUuid;
            
            // Enlazamos la vista al cliente usando su ruta de OData V4 por clave única
            this.getView().bindElement({
                path: "/Clientes(ClientUuid=" + this._sClientUuid + ")"
            });
        },

        onExportarProyectosExcel: function () {
            let aCols = [
                { label: 'Nombre del Proyecto', property: 'Nombre', type: EdmType.String },
                { label: 'Descripción', property: 'Descripcion', type: EdmType.String },
                { label: 'Estatus', property: 'Activo', type: EdmType.String }
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

        onAfterCloseDialogo: async function () {
            const oDialog = await this._pDialog;

            RapHelper.descartarCambios(this.getView().getModel(), this._oContextDialogo);
            oDialog.setBindingContext(null);

            IDS_DIALOGO.forEach((sId) =>
                Fragment.byId(this.getView().getId(), sId)?.setValueState("None"));
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
        _validar: function (sId, bValido, sTexto) {
            const oInput = Fragment.byId(this.getView().getId(), sId);
            oInput?.setValueState(bValido ? "None" : "Error");
            if (!bValido) {
                oInput?.setValueStateText(sTexto);
                oInput?.focus();
            }
            return bValido;
        },

        onGuardarProyecto: async function () {
            const oContext = this._oContextDialogo;
            const oModel = this.getView().getModel();
            const oDialog = await this._pDialog;

            const sNombre = (oContext.getProperty("Nombre") || "").trim();
            const sDescripcion = (oContext.getProperty("Descripcion") || "").trim();
            const sInicio = oContext.getProperty("FechaInicio");
            const sFin = oContext.getProperty("FechaFin");

            // Validaciones básicas
            if (!this._validar("inpNombre", !!sNombre, "El nombre es obligatorio")
                || !this._validar("inpDescripcion", !!sDescripcion, "La descripción es obligatoria")
                || !this._validar("inpFechaInicio", !!sInicio, "La fecha de inicio es obligatoria")
                || !this._validar("inpFechaFin", !!sFin, "La fecha de fin es obligatoria")
                || !this._validar("inpFechaFin", sFin >= sInicio,
                    "La fecha de fin no puede ser anterior a la de inicio")) {
                return;
            }

            if (await RapHelper.guardar(oModel, oDialog)) {
                MessageToast.show("Proyecto guardado");
                oDialog.close();
                
                this.getView().getElementBinding().refresh();
                //RapHelper.refrescar(this.byId("tablaProyectosDetalle").getBinding("items"));
            }
        },

        // Eliminar
        onInactivarProyecto: async function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const bOk = await RapHelper.confirmar(
                `¿Inactivar el proyecto "${oContext.getProperty("Nombre")}"?`);
            if (!bOk) { return; }
            await this._cambiarEstatus(oContext, "inactivar", "Proyecto inactivado");

            this.getView().getElementBinding().refresh();
        },

        onActivarProyecto: async function (oEvent) {
            await this._cambiarEstatus(oEvent.getSource().getBindingContext(),
                "activar", "Proyecto activado");

            this.getView().getElementBinding().refresh();
        },

        _cambiarEstatus: async function (oContext, sAccion, sMensaje) {
            try {
                await RapHelper.ejecutarAccion(this.getView().getModel(), oContext, sAccion);
                MessageToast.show(sMensaje);

                RapHelper.refrescar(this.byId("tablaProyectosDetalle").getBinding("items"));
            } catch (oError) {
                RapHelper.mostrarError(oError.message);
            }
        }

	});
});