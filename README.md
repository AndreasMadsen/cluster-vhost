#cluster-vhost

> cluster-vhost is a plugin to [cluster](http://learnboost.github.com/cluster/) there allow you to use as many virtual host domains as you which.

## Use cluster-vhost

**First: install [cluster](http://learnboost.github.com/cluster/)**

```shell
npm install cluster
```

**Secound: install cluster-vhost**

```shell
npm install cluster-vhost
```

**Third: use plugin**

```javascript
var cluster = require('cluster');
require('cluster-vhost');

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

You can now access you site on `http://example.org:8001`.
In order to access you site on `http://example.org`, you will need to set you firewall up to redirect from port `8001` to port `80`.

##Configure the proxy-server
Pleace wait, the code is made but the documentation is not ...

##Thanks to
* cluster (LearnBoost) https://github.com/learnboost/cluster

##License
WebNodes use the "GPL License Version 3"