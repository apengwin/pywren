/*Bacckground Cloud Function to be triggered by Cloud Storage.
 *
 * @param {object} event The Cloud Functions event.
 * @param {function} The callback function.
 */
const spawn = require('child-process-promise').spawn;
const Storage = require('@google-cloud/storage');

exports.handler = function wrenhandler (req, res) {
  response = {"exception": null};
  const runtime_loc = req.body.runtime.google_bucket;
  const runtimeName = req.body.runtime.google_key;
  const conda_path = "/tmp/condaruntime/bin";
  const storage = Storage();
  const runtime_bucket = storage.bucket(runtime_loc);
  const runtime = runtime_bucket.file(runtimeName);

  const func_filename = "/tmp/func.pickle";
  const data_filename = "/tmp/data.pickle";
  const output_filename = "/tmp/output.pickle";

  const dest = "/tmp/";

  response['func_key'] = req.body.func_key;
  response['data_key'] = req.body.data_key;
  response['output_key'] = req.body.output_key;
  response['status_key'] = req.body.status_key;

  const storage_bucket = storage.bucket(req.body.storage_info.location);
  options = {
    destination: dest + runtimeName 
  }
  response["start_time"] = new Date().getTime()/1000;
  console.log("starting");
  runtime.download(options)
    .then((err) => {
              res.send("ok");
      console.log(`File %{file.name} downloaded to ${dest}.`);

      console.log("Attempting to untar...");
      // tar without attempting to chown, because we can't chown.
      var TAR = spawn("tar",  ["--no-same-owner", "-xzf", "/tmp/" + runtimeName, "-C", "/tmp"]);
      var childProcess = TAR.childProcess;

      TAR.then((err) => {
        console.log("finished untarring");
        const func = storage_bucket.file(req.body.func_key);
        options = {
          destination : func_filename
        }
        return func.download(options)
      })
      .catch(function(error) {
        console.error('ERROR w func download ', error);
        res.send("fail");
      })
      .then((err) => {
        console.log("successfully downloaded function");
        const data = storage_bucket.file(req.body.data_key);
        options = {
          destination: data_filename
        }
        return data.download(options)
      })
      .catch(function(error) {
          console.error('ERROR w data download ', error);
          res.send("fail");
      })
      .then((err) => {
        console.log("successfully downloaded data");

        var attempt_python = spawn(conda_path + "/python", ["jobrunner.py", func_filename, data_filename, output_filename]);
        var pythonProc = attempt_python.childProcess;

        // pipe stdout and stderr from python to console.
        pythonProc.stdout.on('data', function(data) {
          console.log("[PYTHON] stdout: ", data.toString());
        });
        pythonProc.stderr.on('data', function(data) {
          console.log("[PYTHON] stderr: ", data.toString());
        });

        attempt_python.then((err) =>{
          console.log("done with python");
          console.log(req.body.output_key);
          storage_bucket.upload(output_filename, {destination: req.body.output_key})
          .then((err) => {
            const status_file = storage_bucket.file(req.body.status_key);
            console.error('THIS IS THE STATUS KEY ', req.body.status_key);
            console.log(req.body.status_key);
            stream = status_file.createWriteStream();
            stream.write(JSON.stringify(response), function() {
              stream.end();
              console.log("write completed " + req.body.status_key);
            });
          })
          .catch(function(err){
             console.error('Err w uploading output pickle or status file', err);
          });
        });
      }).catch(function(err){
        console.error('Error somewhere after launching python', err);
      });
    }).catch(function(err) {
      console.error('Error ', err);
      response["exception"] = err.toString();
     
      const status_file = storage_bucket.file(req.body.status_key);
      console.log(req.body.status_key);
      stream = status_file.createWriteStream();
      stream.write(JSON.stringify(response));
      stream.end();
      res.send("fail");
    });
}

exports.test_handler = function testhandler (event, callback) {
  response = {"exception": null};
  const pubSubMessage = event.data;
  const req = JSON.parse(Buffer.from(pubSubMessage.data, 'base64').toString());

  const runtime_loc = req.runtime.google_bucket;
  const runtimeName = req.runtime.google_key;
  const conda_path = "/tmp/condaruntime/bin";
  const storage = Storage();
  const runtime_bucket = storage.bucket(runtime_loc);
  const runtime = runtime_bucket.file(runtimeName);

  const func_filename = "/tmp/func.pickle";
  const data_filename = "/tmp/data.pickle";
  const output_filename = "/tmp/output.pickle";

  const dest = "/tmp/";

  response['func_key'] = req.func_key;
  response['data_key'] = req.data_key;
  response['output_key'] = req.output_key;
  response['status_key'] = req.status_key;

  const storage_bucket = storage.bucket(req.storage_info.location);
  options = {
    destination: dest + runtimeName 
  }
  response["start_time"] = new Date().getTime()/1000;
  console.log("starting");
  runtime.download(options)
    .then((err) => {
      console.log(`File %{file.name} downloaded to ${dest}.`);

      console.log("Attempting to untar...");
      // tar without attempting to chown, because we can't chown.
      var TAR = spawn("tar",  ["--no-same-owner", "-xzf", "/tmp/" + runtimeName, "-C", "/tmp"]);
      var childProcess = TAR.childProcess;

      TAR.then((err) => {
        console.log("finished untarring");
        const func = storage_bucket.file(req.func_key);
        options = {
          destination : func_filename
        }
        return func.download(options)
      })
      .catch(function(error) {
        console.error('ERROR w func download ', error);
        callback();
      })
      .then((err) => {
        console.log("successfully downloaded function");
        const data = storage_bucket.file(req.data_key);
        options = {
          destination: data_filename
        }
        return data.download(options)
      })
      .catch(function(error) {
          console.error('ERROR w data download ', error);
          callback();
      })
      .then((err) => {
        console.log("successfully downloaded data");

        var attempt_python = spawn(conda_path + "/python", ["jobrunner.py", func_filename, data_filename, output_filename]);
        var pythonProc = attempt_python.childProcess;

        // pipe stdout and stderr from python to console.
        pythonProc.stdout.on('data', function(data) {
          console.log("[PYTHON] stdout: ", data.toString());
        });
        pythonProc.stderr.on('data', function(data) {
          console.log("[PYTHON] stderr: ", data.toString());
        });

        attempt_python.then((err) =>{
          console.log("done with python");
          console.log(req.output_key);
          storage_bucket.upload(output_filename, {destination: req.output_key})
          .then((err) => {
            const status_file = storage_bucket.file(req.status_key);
            console.error('THIS IS THE STATUS KEY ', req.status_key);
            console.log(req.status_key);
            stream = status_file.createWriteStream();
            stream.write(JSON.stringify(response), function() {
              stream.end();
              console.log("write completed " + req.status_key);
              callback();
            });
          })
          .catch(function(err){
             console.error('Err w uploading output pickle or status file', err);
             callback();
          });
        });
      }).catch(function(err){
        console.error('Error somewhere after launching python', err);
        callback();
      });
    }).catch(function(err) {
      console.error('Error ', err);
      response["exception"] = err.toString();
     
      const status_file = storage_bucket.file(req.status_key);
      console.log(req.status_key);
      stream = status_file.createWriteStream();
      stream.write(JSON.stringify(response));
      stream.end();
      callback();
    });
}
/* Utility functions to figure out what's going on under the hood, 
 * since I haven't figured out how to ssh onto a GCF vm
 */

exports.neitzsche = function HELLO (event, callback) {
  // You are root. The ubermensch
  var promise = spawn("whoami");
  var childProcess = promise.childProcess;

  childProcess.stdout.on('data', function (data) {
    console.log('[spawn] stdout: ', data.toString());
  });
  childProcess.stderr.on('data', function (data) {
    console.log('[spawn] stderr: ', data.toString());
  });

  promise.then(function(result) {
    console.log(result.stdout.toString());
  }).catch(function(err) {
    console.error(err.stderr);
  }); 
  callback();
}

exports.list = function list(event, callback) {
  var LS_COMMAND = spawn("ls", ["-lha", "/tmp"]);
  var childProc = LS_COMMAND.childProcess;

  childProc.stdout.on('data', function (data) {
    console.log("[LS] stdout: ", data.toString());
  });
  childProc.stderr.on('data', function (data) {
    console.log("[LS] stderr: ", data.toString());
  });

  LS_COMMAND.then(function(result) {
    console.log(result.toString());
  });
}

exports.OS = function list(req, res) {
  var LS_COMMAND = spawn("cat", ["/etc/issue"]);
  var childProc = LS_COMMAND.childProcess;

  childProc.stdout.on('data', function (data) {
    console.log("[OS] stdout: ", data.toString());
  });
  childProc.stderr.on('data', function (data) {
    console.log("[OS] stderr: ", data.toString());
  });

  LS_COMMAND.then(function(result) {
    console.log(result.toString());
  });
  res.send("ok");
}

exports.CPU = function list(event, callback) {
  var LS_COMMAND = spawn("lscpu", []);
  var childProc = LS_COMMAND.childProcess;

  childProc.stdout.on('data', function (data) {
    console.log("[OS] stdout: ", data.toString());
  });
  childProc.stderr.on('data', function (data) {
    console.log("[OS] stderr: ", data.toString());
  });

  LS_COMMAND.then(function(result) {
    console.log(result.toString());
  });
}
