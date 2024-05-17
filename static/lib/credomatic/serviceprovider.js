

ServiceProvider = function() {
    this.proxy = new ServiceProxy("http://localhost:0808/baccredomatic");

    this.SdkInvoke = function(text) {
        return this.invoke("SdkInvoke", text);
    };

   this.invoke = function(method, message) {
        var response = false;
        this.proxy.invoke(method, message, function(result) {
            response = result;
        }, this.ProcessError);
        return response;
    };

    this.ProcessError = function(xhr) {
        var reason = xhr.status + ": " + xhr.statusText;
        alert("I've got an error: " + reason);
    };
};