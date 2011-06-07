!function () {

    var Lib = function () {
        var self = this;
        Lib.superClass.apply(this); 

        this.main = function () { 
            this.context.html('Menu');
        }
    }
    Lib.extend(window.Module); 

    $("script[id=core]").trigger({
        type: "request",                
        header: "attach", 
        body: {
            module: Lib, 
            name: "Menu",
            contextContainer: '#mainMenu' 
        }
    });

} ();
