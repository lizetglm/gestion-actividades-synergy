sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function(
	Controller,
    JSONModel,
    Filter,
    FilterOperator,
    MessageToast,
    MessageBox
) {
	"use strict";

	return Controller.extend("ns.frontend.controller.admin.Perfiles", {
        onInit: function(){
            var aUsers = [
                {
                    fullName: "Carlos Ruiz",
                    userId: "CRUIZ",
                    email: "carlos.ruiz@empresa.com",
                    department: "Consultoría",
                    location: "Irapuato, Guanajuato",
                    creationDate: "12/03/2024",
                    status: "Activo",
                    roles: [
                        {
                            name: "Consultor Nivel 1",
                            description: "Consultor Nivel 1",
                            source: "SAP",
                            validFrom: "",
                            validTo: ""
                        },
                        {
                            name: "Gestor de Proyectos",
                            description: "Gestor de Proyectos",
                            source: "SAP",
                            validFrom: "",
                            validTo: ""
                        },
                        {
                            name: "Finanzas - Reportes",
                            description: "Finanzas - Reportes",
                            source: "SAP",
                            validFrom: "",
                            validTo: ""
                        },
                        {
                            name: "TI - Soporte",
                            description: "TI - Soporte",
                            source: "SAP",
                            validFrom: "",
                            validTo: ""
                        }
                    ]
                },
                {
                    fullName: "Maria García",
                    userId: "MGARCIA",
                    email: "maria.garcia@empresa.com",
                    department: "Administración",
                    location: "Irapuato, Guanajuato",
                    creationDate: "05/06/2023",
                    status: "Activo",
                    roles: []
                },
                {
                    fullName: "Juan Pérez",
                    userId: "JUAZ",
                    email: "juan.perez@empresa.com",
                    department: "Finanzas",
                    location: "León, Guanajuato",
                    creationDate: "18/01/2023",
                    status: "Inactivo",
                    roles: []
                },
                {
                    fullName: "Marica García",
                    userId: "CRUIZ",
                    email: "marica.garcia@empresa.com",
                    department: "Consultoría",
                    location: "Irapuato, Guanajuato",
                    creationDate: "22/08/2024",
                    status: "Activo",
                    roles: []
                },
                {
                    fullName: "Johnen García",
                    userId: "MGARCIA",
                    email: "johnen.garcia@empresa.com",
                    department: "TI",
                    location: "Irapuato, Guanajuato",
                    creationDate: "14/11/2023",
                    status: "Activo",
                    roles: []
                },
            ];
            var oModel = new JSONModel({
                users: aUsers,
                selectedUser: aUsers[0]
            });
            this.getView().setModel(oModel, "users");
            var oList = this.byId("listaUsuarios");
            if (oList && oList.getItems().length > 0){
                oList.setSelectedItem(oList.getItems()[0], true);
            }
        },
        onUserSelect: function(oEvent){
            var oItem = oEvent.getParameter("listItem");
            if (!oItem){
                var aItems = oEvent.getParameter("listItems");
                oItem = aItems && aItems[0];
            }
            if (!oItem){
                return;
            }
            var oUser = oItem.getBindingContext("users").getObject();
            this.getView().getModel("users").setProperty(
                "/selectedUser",
                oUser
            );
        },
        onSearch: function(oEvent){
            var sQuery = (
                oEvent.getParameter("newValue") || ""
            ).trim();
            var oList = this.byId("listaUsuarios");
            var oBinding = oList.getBinding("items");
            if (!sQuery){
                oBinding.filter([]);
                return;
            }
            var aFilters = [
                new Filter({
                    filters: [
                        new Filter(
                            "fullName",
                            FilterOperator.Contains,
                            sQuery
                        ),
                        new Filter(
                            "userId",
                            FilterOperator.Contains,
                            sQuery
                        )
                    ],
                    and: false
                })
            ];
            oBinding.filter(aFilters);
        },
        onEditUser: function(){
            MessageToast.show(
                "La edición se implementará en el siguiente paso."
            );
        },
        onAssignRole: function(){
            MessageToast.show(
                "La asignación de roles se implementará en el siguiente paso."
            );
        },
        onDeleteRole: function(){
            var oTable = this.byId("tablaRoles");
            var oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem){
                MessageToast.show("Selecciona un rol primero.");
                return;
            }
            var oContext = oSelectedItem.getBindingContext("users");
            var sPath = oContext.getPath();
            var oModel = this.getView().getModel("users");
            MessageBox.confirm(
                "¿Deseas eliminar este rol de los datos de demostración?",
                {
                    onClose: function(sAction){
                        if (sAction !== MessageBox.Action.OK){
                            return;
                        }

                        var aRoles = oModel.getProperty(
                            "/selectedUser/roles"
                        ) || [];

                        var iIndex = parseInt(
                            sPath.substring(sPath.lastIndexOf("/") + 1),
                            10
                        );

                        aRoles.splice(iIndex, 1);

                        oModel.setProperty(
                            "/selectedUser/roles",
                            aRoles.slice()
                        );

                        oTable.removeSelections();

                        MessageToast.show(
                            "Rol eliminado de la demostración."
                        );
                    }
                }
            );
        },

        onSave: function(){
            MessageToast.show(
                "Los cambios son de demostración y no se guardan en SAP."
            );
        },
        onCancel: function(){
            MessageToast.show("Acción cancelada.");
        },
        onCreateUser: function(){
            MessageToast.show(
                "El formulario de nuevo usuario se implementará en el siguiente paso."
            );
        }
	});
});