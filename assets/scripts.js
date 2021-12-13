function redirect(string) {
    window.location.href = string
}
function news_update(id, value) {
    if (value.length === 0) {
        document.getElementById("error").innerHTML = "";
        return;
    } else {
        var http = new XMLHttpRequest();
        http.open("POST", "/news_update", true);
        http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
        http.onreadystatechange = function() {
            if (this.readyState === 4 && this.status === 200) {
                redirect('/news_item/' + id);
            }
        };
        http.send('id='+id+'&value='+encodeURIComponent(value));
    }
}
function delete_worker(id) {
    if (value.length === 0) {
        document.getElementById("error").innerHTML = "";
        return;
    } else {
        var http = new XMLHttpRequest();
        http.open("POST", "/news_update", true);
        http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
        http.onreadystatechange = function() {
            if (this.readyState === 4 && this.status === 200) {
                redirect('/news_item/' + id);
            }
        };
        http.send('id='+id+'&value='+encodeURIComponent(value));
    }
}