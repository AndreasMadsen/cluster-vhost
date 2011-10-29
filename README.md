#cluster-vhost

> cluster-vhost is a plugin to [cluster](http://learnboost.github.com/cluster/) there allow you to use as many virtual host domains as you which.

## Features
 - Ridiculously easy to use
 - Support http to http proxy
 - Support https to http proxy
 - transparent proxy remoteAdress

##How to use

**Install:**

```shell
npm install cluster
npm install cluster-vhost
```

**Using:**

```javascript
var cluster = require('cluster');
    cluster.vhost = require('cluster-vhost');

cluster('./app')
  .use(cluster.vhost('example.org'))
  .on("vhost configured", function () {
    console.log("You can now access your app, by opening http://example.org:8001 in you browser");
  })
  .listen(3000);
```

## Detailed use instructions

**First: install**<br>
You will need to install `cluster` if you haven't allready done so

```shell
npm install cluster
```

**Secound: install cluster-vhost**<br>
Now you are ready to install `cluster-vhost`

```shell
npm install cluster-vhost
```

**Third: use plugin**<br>
Create a server.js file where, in this file you require both `cluster` and `cluster-vhost`.
To setup vhost use the `cluster.vhost` function there take the hostname as its single argument.

```javascript
var cluster = require('cluster');
    cluster.vhost = require('cluster-vhost');

cluster('./app')
  .use(cluster.vhost('example.org'))
  .listen(3000);
```

**Fourth: edit you hosts file**<br>
*You will need to edit you [hosts](http://en.wikipedia.org/wiki/Hosts_file) file to redirect example.org to you own computer.*

First open the file in you text editor.

* On mac and linux you will find a file named `hosts` in  `/private/etc/`.
* On windows you will find a file named `hosts` in `C:\Windows\system32\drivers\etc\hosts`.

After the line `localhost 127.0.0.1` create a new line with the text `example.org 127.0.0.1`.
The result will be:

```javascript
localhost   127.0.0.1
example.org 127.0.0.1
```

**Fifth: open you browser**

You can now access you site on `http://example.org:8001`.<br>
In order to access you site on `http://example.org`, you will need
to set you firewall up to redirect from port `8001` to port `80`.

##When is the proxy-server reaady
When using `cluster-vhost`, `cluster` will emit a `vhost configured` event when everything is running and ready.

```javascript
var cluster = require('cluster');
    cluster.vhost = require('cluster-vhost');

cluster('./app')
  .use(cluster.vhost('example.org'))
  .on("vhost configured", function () {
    console.log("cluster-vhost is ready");
  })
  .listen(3000);
```

##Configure the proxy-server

###Creating the file<br>
*You do not need to create a configuration file, if none is found the module will use default values.*

`cluster-vhost` can be configured with a `config.json` file. The first
step i to create it the in the right directory. This module will searce
for `config.json` in its own directory and then go up in the folder tree
until it find a `config.json` file.

For instance you may have all you sites in `~/Sites/`, it was also there
you installed `cluster` and `cluster-vhost` which means you have a
`node_modules` folder contaning a `cluster` and a `cluster-vhost` folder.
`cluster-vhost` will then search for `config.json` in:

```text
~/Sites/node_modules/cluster-vhost/config.json
~/Sites/node_modules/config.json
~/Sites/config.json
~/config.json
```

In this case you will most likely place it in `~/Sites/`.

####Alternativ configure method

Insted of search for the `config.json` you can also configure the `proxy-server` by using the `module.config()`
method.

`module.config()` method accept a filepath or an object.
* If a filepath is given it must contain a valid json string.
* If a object is given it must contain a valid json object.

Because this function is blocking you should only place it along with the `require` method with is also blocking.

```javascript
var cluster = require("cluster");
    cluster.vhost = require("cluster-vhost").config("./vhost.config");

cluster('./app')
  .use(cluster.vhost('example.org'))
  .listen(3000);
```

###Writeing the file

Because another `node-module` may also use you a config.json file,
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
        //You can in this object specify what the virtual host router should listen, just like the http object.
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

* cluster (LearnBoost) https://github.com/learnboost/cluster
* http-proxy-server (nodejitsu) https://github.com/nodejitsu/node-http-proxy

##License
WebNodes use the "GPL License Version 3"