sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "ns/frontend/model/models"
], function (UIComponent, Device, JSONModel, models) {
    "use strict";

    return UIComponent.extend("ns.frontend.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {

            // Inicialización del componente SAPUI5
            UIComponent.prototype.init.apply(this, arguments);

            // Modelo global de autenticación y perfil
            var oUiEstado = new JSONModel({
                tituloHeader: "",
                userName: "",
                saludo: "Cargando información del usuario...",
                esConsultor: false,
                esAdministrador: false,
                autenticacionFinalizada: false,
                errorAutenticacion: false
            });

            this.setModel(oUiEstado, "uiPantalla");

            // Modelo de dispositivo
            this.setModel(models.createDeviceModel(), "device");

            // Modelo temporal de clientes y proyectos
            var oModelClientes = new JSONModel("model/clientes.json");
            this.setModel(oModelClientes, "modeloClientes");

            // Inicializar navegación después de crear los modelos
            this.getRouter().initialize();
        },

   


    });
});