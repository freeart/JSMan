!function () {

    var Lib = function () {
        var self = this;
        Lib.superClass.apply(this);

        var isBusy;

        this.commit = function () {
            isBusy = false;
        }

        this.rollback = function () {
            isBusy = false;
        }

        this.main = function () {
            this.context.html('GoodBay World with param: "' + this.param + '"');
            isBusy = true;
        }

        this.onHide = function () {
            if (isBusy) {
                var dfd = $.Deferred();
                dfd.reject();
                return dfd;
            }
        }
    }
    Lib.extend(window.Module);

    $("script[id=core]").trigger({
        type: "request",
        header: "attach",
        body: {
            module: Lib,
            name: "GoodBay"
        }
    });

} ();
