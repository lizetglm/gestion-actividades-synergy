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
            this._sClientIndex = oEvent.getParameter("arguments").clientIndex;
            this.getView().bindElement({
                path: "/clientes/" + this._sClientIndex,
                model: "mock"
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
            var sPath = oEvent.getSource().getBindingContext("mock").getPath();
            var sProjIndex = sPath.split("/").pop(); 
            
            this.getOwnerComponent().getRouter().navTo("RouteRequerimientos", {
                clientIndex: this._sClientIndex,
                projectIndex: sProjIndex
            });
        },

        onCloseColumn: function () {
            this.getOwnerComponent().getRouter().navTo("RouteClientesProyectos");
        },


        // CRUD ----------------------------------------------------
        onAddProyecto: function () {
            this._bEsEdicion = false;
            let oDatosNuevos = {
                idProyecto: "", nombreProyecto: "", descripcion: "", estatusProyecto: "En Progreso", requerimientos: []
            };
            this._abrirDialogoProyecto(oDatosNuevos);
        },

        onEditProyecto: function (oEvent) {
            this._bEsEdicion = true;
            let oItem = oEvent.getSource();
            this._sEditPath = oItem.getBindingContext("mock").getPath();
            
            // Clonamos los datos para no afectar la tabla antes de guardar
            let oDatosActuales = JSON.parse(JSON.stringify(oItem.getBindingContext("mock").getObject()));
            
            // Mapeo temporal para que coincida con tu Fragment de DialogProyecto
            oDatosActuales.nombre = oDatosActuales.nombreProyecto;
            oDatosActuales.estatus = oDatosActuales.estatusProyecto;

            this._abrirDialogoProyecto(oDatosActuales);
        },

        _abrirDialogoProyecto: function (oDatos) {
            let oView = this.getView();
            let oDialogModel = new JSONModel(oDatos);

            if (!this._oDialogProyecto) {
                Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.DialogProyecto",
                    controller: this
                }).then(function (oDialog) {
                    this._oDialogProyecto = oDialog;
                    oView.addDependent(this._oDialogProyecto);
                    this._oDialogProyecto.setModel(oDialogModel, "nuevoReq");
                    this._oDialogProyecto.open();
                }.bind(this));
            } else {
                this._oDialogProyecto.setModel(oDialogModel, "nuevoReq");
                this._oDialogProyecto.open();
            }
        },

        onCerrarDialogProyecto: function () {
            if (this._oDialogProyecto) {
                this._oDialogProyecto.close();
            }
        },

        onGuardarProyectoMock: function () {
            let oModeloDialog = this._oDialogProyecto.getModel("nuevoReq").getData();
            let oModelMain = this.getView().getModel("mock");

            // Mapeo inverso de regreso a la estructura JSON principal
            oModeloDialog.nombreProyecto = oModeloDialog.nombre;
            oModeloDialog.estatusProyecto = oModeloDialog.estatus;

            if (this._bEsEdicion) {
                oModelMain.setProperty(this._sEditPath, oModeloDialog);
                MessageToast.show("Proyecto actualizado correctamente.");
            } else {
                let sPathProyectos = "/clientes/" + this._sClientIndex + "/proyectos";
                let aProyectos = oModelMain.getProperty(sPathProyectos) || [];
                aProyectos.push(oModeloDialog);
                oModelMain.setProperty(sPathProyectos, aProyectos);
                
                // Actualiza el contador de proyectos del cliente
                let iTotal = aProyectos.length;
                oModelMain.setProperty("/clientes/" + this._sClientIndex + "/totalProyectos", iTotal);
                
                MessageToast.show("Nuevo proyecto creado exitosamente.");
            }

            this.onCerrarDialogProyecto();
        },

        onInactivarProyecto: function (oEvent) {
            let oContext = oEvent.getSource().getBindingContext("mock");
            let sPath = oContext.getPath();
            let sProyecto = oContext.getProperty("nombreProyecto");

            MessageBox.confirm("¿Estás seguro de inactivar el proyecto " + sProyecto + "?", {
                title: "Confirmar Inactivación",
                icon: MessageBox.Icon.WARNING,
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        let oModel = this.getView().getModel("mock");
                        let aPathParts = sPath.split("/");
                        let iIndexProyecto = parseInt(aPathParts.pop(), 10); // Índice del proyecto
                        aPathParts.pop(); // Quita 'proyectos'
                        let sPathPadre = aPathParts.join("/") + "/proyectos"; 

                        let aProyectos = oModel.getProperty(sPathPadre);
                        aProyectos.splice(iIndexProyecto, 1);
                        oModel.setProperty(sPathPadre, aProyectos);
                        
                        // Actualiza el contador
                        oModel.setProperty("/clientes/" + this._sClientIndex + "/totalProyectos", aProyectos.length);
                        
                        MessageToast.show("Proyecto removido exitosamente.");
                    }
                }.bind(this)
            });
        }
	});
});