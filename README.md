Evernote OAuth Proxy
====================

For security reasons, Evernote javascript api does not normally work on any browsers.  
This application works as a proxy server and allows you to use [evernote-sdk-js](https://github.com/evernote/evernote-sdk-js) on a pure client side application.

> **REF**  
> [Does the API support CORS (Cross origin resource sharing)](https://github.com/evernote/evernote-sdk-js#does-the-api-support-cors-cross-origin-resource-sharing)


## Setup
1. Get Evernote API Consumer Key and Consumer Secret from [here](https://dev.evernote.com/#apikey).

1. Copy `config.json.template` to `config.json` and fill in your values.

1. Install dependencies.
   ```
   $ npm install
   ```


## Usage
1. Start server
   ```
   $ node server.js
   ```

1. Access to `http://localhost:9999/oauth?callbackurl=http://xxx.html`  
   Change `http://localhost:9999` and `callbackurl` value `http://xxx.html` according to your environment.

1. You will be redirected to Evernote authentication page.

1. When authentication is successful, you will be redirected to `http://xxx.html` with the query param `oauthAccessToken`.

   > **NOTE**
   > The `oauthAccessToken` is encoded, so you have to decode it by `decodeURIComponent` function.

1. You can use `oauthAccessToken` for `evernote-sdk-js` by using `http://localhost:9999/noteStore?oauthAccessToken=yyy` as `noteStoreURL`.

1. See also [Sample client](#sample_client) and [REDME.md of "Evernote SDK for JavaScript"](https://github.com/evernote/evernote-sdk-js).  
   You can see all functions of `NoteStore` [here](https://dev.evernote.com/doc/reference/).


## Sample client<a href="sample_client"></a>
Below is a simple application to get the `oauthAccessToken` and to show notebook list.

Before using it, download `evernote-sdk-minified.js` and store it at `js/` directory.  
`evernote-sdk-minified.js` can be downloaded from [production directory of evernote-sdk-js](https://github.com/evernote/evernote-sdk-js/blob/master/evernote-sdk-js/production).

```javascript
<!DOCTYPE html>
<html>
<head>
<script src="js/evernote-sdk-minified.js"></script>
<script type="text/javascript">
  function getParameter(name) {
    var regex = new RegExp(name + "=(.+?)(&|$)");
    try {
      return decodeURIComponent(regex.exec(location.search)[1]);
    } catch (e) {
      return undefined;
    }
  }

  // TODO change to valid server
  var proxyServerAddr = "http://localhost:9999";

  var oauthAccessToken = getParameter("oauthAccessToken");
  if (!oauthAccessToken) {
    var selfAddr = window.location.href.replace(/window.location.search/, "");
    // redirect to auth page
    window.location.href = proxyServerAddr + "/oauth" + "?callbackurl=" + selfAddr;
  } else {
    var noteStoreURL = proxyServerAddr + "/noteStore" + "?oauthAccessToken=" + oauthAccessToken;
    var noteStoreTransport = new Thrift.BinaryHttpTransport(noteStoreURL);
    var noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport);
    var noteStore = new NoteStoreClient(noteStoreProtocol);
    // Get the notebook list and display on console.
    noteStore.listNotebooks(oauthAccessToken,
      function(notebooks) {
        console.log(notebooks);
      },
      function (error) {
        console.log(error.errorCode + ": " + error.parameter);
      });
  }
</script>
</head>
</html>
```


## Deploy on Heroku

1. Create a new Heroku app

   ```
   heroku apps:create APP_NAME
   ```

1. Provide API_CONSUMER_KEY and API_CONSUMER_SECRET:

   ```
   heroku config:set API_CONSUMER_KEY=XXXX API_CONSUMER_SECRET=YYYY
   ```

1. Push changes to heroku

   ```
   git push heroku master
   ```
OR

   ```
   heroku restart
   ```

## Acknowledgment
I decided to make this app for [StackEdit](https://github.com/benweet/stackedit) and consulted [Gatekeeper](https://github.com/prose/gatekeeper).
