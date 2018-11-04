/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// middleware to serve the results of shell commands
// Listens to POST /run/
const {spawn} = require('child_process');
module.exports = function(workingDir, useLoginShell) {
  const args = useLoginShell ? ['-l'] : [];
  // the Connect middleware
  return function(req, res, next) {
    if ((req.method !== 'POST') || (req.url !== '/run/')) { return next(); }
    const shell = spawn('bash', args, {cwd: workingDir});

    let command = '';
    req.on('data', chunk => command += chunk);
    return req.on('end', function() {
      var setStatus = function(status) {
        res.writeHead(status);
        return setStatus = function() {};
      };

      shell.stderr.on('data', function(d) {
        setStatus(500);
        return res.write(d);
      });

      shell.stdout.on('data', function(d) {
        setStatus(200);
        return res.write(d);
      });

      shell.on('error', function(err) {
        setStatus(500);
        return res.write(err.message);
      });

      shell.on('close', function() {
        setStatus(200);
        return res.end();
      });

      shell.stdin.write(command != null ? command : '');
      shell.stdin.write('\n');
      return shell.stdin.end();
    });
  };
};




