#cluster-vhost

> cluster-vhost is a module there allow you to use as many virtual host domains as you which. It is often used in combination with the [cluster](http://nodejs.org/docs/latest/api/cluster.html) module but it is not required.
>
> This module require node 0.7.0-pre or higher since the 0.6.0 cluster module isn't sophisticated enough.

## Features
 - Ridiculously easy to use
 - Support http to http proxy
 - Support https to http proxy
 - transparent proxy remoteAddress

##How to use

####Install:

```shell
npm install cluster-vhost
```

####Use:

```javascript
var cluster = require('cluster'),
    vhost = require('cluster-vhost');
    
vhost.use('example.org');
vhost.on('done', function () {
	console.log("You can now access your app, by opening http://example.org:8001 in your browser");
});
vhost.on('error', function (err) {
	console.error('not good');
	throw err;
});

//Start cluster
cluster.autoFork();
```

####Done:

You can now access your site on `http://example.org:8001`.<br>
In order to access your site on `http://example.org`, you will need
to configure your firewall to redirect from port `8001` to port `80`.

##Configure host file

*You will need to edit you [hosts](http://en.wikipedia.org/wiki/Hosts_file) file to redirect example.org to you own computer.*

First open the file in you text editor.

* On mac and linux you will find a file named `hosts` in  `/private/etc/`.
* On windows you will find a file named `hosts` in `%WINDIR%\system32\drivers\etc\hosts`.

After the line `localhost 127.0.0.1` create a new line with the text `example.org 127.0.0.1`.
The result will be:

```javascript
localhost   127.0.0.1
example.org 127.0.0.1
```

##Configure the proxy-server

###Creating the file<br>
*You do not need to create a configuration file, if none is found the module will use default values.*

`cluster-vhost` can be configured with a `config.json` file. The first
step is to create it the in the right directory. This module will search
for `config.json` in its own directory and then go up in the folder tree
until it finds a `config.json` file.

Example: if you have your websites in `~/Sites/` and typed `npm install cluster-vhost`
here, you will have it in a `node_modules` folder. `cluster-vhost` will then search for
a `config.json` file in the following directories:

```text
~/Sites/node_modules/cluster-vhost/config.json
~/Sites/node_modules/config.json
~/Sites/config.json
~/config.json
```

####Alternative configuration method

Instead of searching for `config.json` you can also configure the `proxy-server` by using the `vhost.config()`
method.

`vhost.config()` method accepts a filepath or an object.

* If a filepath is given it must contain a valid json string.
* If a object is given it must contain a valid json object.

```javascript
var cluster = require("cluster"),
	vhost = require("cluster-vhost");

vhost.config('./config.json');
vhost.use('example.org');

//Start cluster
cluster.autoFork();
```

###Writing the file

Because another `node-module` may also use your a `config.json` file,
all `cluster-vhost` properties should be placed in a `vhost` object.
There are several properties you can set, all will fallback to its
default value if not set.

```javascript
{
    //Because other modules may use a config.json file place you options insite a vhost obejct.
    "vhost" : {
        
        //You can specify on what the virtual host router should listen on.
        //You can also set it to false if you don't want it to listen for http requests.
        "http" : {
            
            //By default it will listen for http requests on 127.0.0.1:8001
            "port" : 8001,
            "host" : "127.0.0.1",
            
            //You can also use a unix path to listen on, but this will only work if no port property is set.
            "path" : "./custom/unix/http.sock"
            
        },
        
        //The ssl property is a path to a directory containing a key.pem and a cert.pem file.
        //By default the ssl property is set to undefined.
        "ssl" : "./Sites/ssl/",
        
        //If and only if a ssl property is set you can use https, else it will fallback to false.
        //You can in this object specify what the virtual host router should listen on, just like the http object.
        "https" : {
            
            //By default if the ssl property is set it will listen for https requests on 127.0.0.1:8002
            "port" : 8002,
            "host" : "127.0.0.1",
            
            //Again you can also use a unix path
            "path" : "./custom/unix/https.sock"
        },
        
        //In order to send new information to the route-table a unix socket is required.
        //This property is a path to a directory where a http.sock and https.sock will be created.
        //By default this folder will be made insite the custer-vhost module folder.
        "sock" : "./custom/sock/",
        
        //Because of the way the proxy-server route requests the remoteAdress property will not point
        //to the client but to the proxy-server (by default 127.0.0.1).
        //When transparantProxy is set to true it will modify the native http module so its remoteAdress
        //property point to the client. By default this it set to true, but if you don't which this
        //you can set it to false.
        "transparantProxy" : true
    }
}
```  

##Thanks to

* http-proxy-server (nodejitsu) https://github.com/nodejitsu/node-http-proxy

##License
WebNodes use the "GPL License Version 3"