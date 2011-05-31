!function () { 

    var Lib = function () {
        var self = this;
        Lib.superClass.apply(this); 

        var answer2;

        this.main = function () {
            this.context.html('Hello World with param: "' + this.param + '"');
        }

        this.onHide = function () {
            var dfd = $.Deferred();
            if (!answer2) {
                answer2 = true;
                dfd.reject();
            } else {
                dfd.resolve();
            }
            return dfd;
        }
    }
    Lib.extend(window.Module); 

    $("script[id=core]").trigger({  
        type: "msg",                
        header: "attach", 
        body: {
            module: Lib, 
            name: "Hello" 
        }
    });

} ();
