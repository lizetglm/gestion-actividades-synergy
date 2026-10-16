sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "sap/m/VBox",
    "sap/m/Text",
    "sap/ui/model/json/JSONModel"
], function(
	Controller, VBox, Text, JSONModel
) {
	"use strict";

	return Controller.extend("ns.frontend.controller.CalendarioActividades", {
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        onInit: function () {
            this._crearCalendario();
            let  uiEstado = {
				tituloHeader: this.getResourceBundle().getText("titleCalendario"),
            };  

            this.getView().setModel(new JSONModel(uiEstado), "uiPantalla");
        },

        onBack: function() {
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        },

        _crearCalendario: function(){
            var oCalendar = this.byId("calendarGrid");
            oCalendar.removeAllItems();
            var iYear = 2026;
            var iMonth = 8;
            var oFirstDay = new Date(iYear, iMonth, 1);
            var iDaysInMonth = new Date(iYear, iMonth + 1, 0).getDate();
            var iStartDay = oFirstDay.getDay();
            if(iStartDay === 0){
                iStartDay = 6;
            }else{
                iStartDay = iStartDay - 1;
            }
            for(var i = 0; i < iStartDay; i++){
                var oEmptyDay = new VBox({
                    height: "70px"
                });
                oEmptyDay.addStyleClass(
                    "calendarDay"
                );
                oEmptyDay.addStyleClass(
                    "emptyDay"
                );
                oCalendar.addItem(oEmptyDay);
            }
            for(
                var iDay = 1;
                iDay <= iDaysInMonth;
                iDay++
            ){
                var oDay = new VBox({
                    height: "70px"
                });
                oDay.addStyleClass(
                    "calendarDay"
                );
                var oNumber = new Text({
                    text: String(iDay)
                });
                oNumber.addStyleClass(
                    "dayNumber"
                );
                oDay.addItem(oNumber);
                if(iDay <= 11){
                    oDay.addStyleClass(
                        "completedDay"
                    );
                    var oStatus = new Text({
                        text: "●"
                    }).addStyleClass("grandeCirculo");
                    oStatus.addStyleClass(
                        "dayStatus"
                    );
                    oDay.addItem(oStatus);
                    var oHours = new Text({
                        text: "5.5 h"
                    });
                    oHours.addStyleClass(
                        "dayHours"
                    );
                    oDay.addItem(oHours);
                }
                if(iDay === 11){
                    oDay.removeStyleClass(
                        "completedDay"
                    );
                    oDay.addStyleClass(
                        "currentDay"
                    );
                }
                oCalendar.addItem(oDay);
            }
        },
        onExportExcel: function(){
        // Falta
        },
        onPressVerReporte: function(){
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteReporteMensual");
        },
        onPressVerUsuarios: function(){
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RoutePerfiles");
        }
	});
});