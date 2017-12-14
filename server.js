const config = require('config');
const kurento = require('kurento-client');

var kurentoClient = null;

function getKurentoClient(callback) {
    if (kurentoClient !== null) {
        return callback(null, kurentoClient);
    }
    var wsUri = process.argv[2] || config.get('kurento.uri');

    kurento(wsUri, function(error, _kurentoClient) {
        if (error) {
            console.log("Could not find media server at address" + wsUri + ". Exiting with error " + error);
            return callback(error);
        }
        kurentoClient = _kurentoClient;
        callback(null, kurentoClient);
    });
}

function getInfoKurentoServer(server, callback) {
    if (!server) {
        return callback('error - failed to find server');
    }

    server.getInfo(function(error, info) {
        if (error) {
            return callback(error);
        }

        return callback(info);
    })
}

// Metadata stored in the server
function getMetadataInfo(server, callback) {
    if (!server) {
        return callback('error - failed to find server');
    }

    server.getMetadata(function(error, metadata) {
        if (error) {
            return callback(error);
        }

        console.log('Number metadata: ' + metadata.length);
        return callback(metadata);
    })
}

function getPipelinesInfo(server, callback) {
    if (!server) {
        return callback('error - failed to find server');
    }

    var _pipelines = {};

    server.getPipelines(function(error, pipelines) {
        if (error) {
            return callback(error);
        }

        if (pipelines && (pipelines.length < 1)) {
            return callback(null, _pipelines);
        }

        var counter = 0;
        pipelines.forEach(function(p, index, array) {
            p.getChilds(function(error, elements) {
                this.childs = elements;
                _pipelines[counter] = this
                counter++;
                if (counter == array.length) {
                    return callback(null, _pipelines);
                }
            })
        })
    })
}

// All active sessions in the server
function getSessionsInfo(server, callback){
    if (!server) {
        return callback('error - failed to find server');
    }

    var _sessions = {};
    server.getSessions(function(error, sessions) {
        if (error) {
            return callback(error);
        }
        if (sessions && (sessions.length < 1)) {
            return callback(null, _sessions);
        }
        var counter = 0;
        sessions.forEach(function(p, index, array) {
            if (p != '') {

                _sessions[counter] = p;
                counter++;
            }
        })
        console.log('Number sessions: ' + counter);
        return callback(_sessions);
    })
}

function getAllSessions(server, callback) {
    if (!server) {
        return callback('error - failed to find server');
    }

    server.getInfo(function(error, serverInfo) {
        if (error) {
            return callback(error);
        }

        getSessionsInfo(server, function(error, sessionsInfo) {
            if (error) {
                return callback(error);
            }

            var sessionsNumber = Object.keys(sessionsInfo).length;

            //add pipeline info to server info
            serverInfo.sessionsNumber = sessionsNumber;
            serverInfo.sessions = sessionsInfo;
            return callback(JSON.stringify(serverInfo.sessions, null, 1));
        });
    })
}

function getListId(server, callback) {
    if (!server) {
        return callback('error - failed to find server');
    }
    var _idList = {};

    server.getInfo(function(error, serverInfo) {
        if (error) {
            return callback(error);
        }

        getPipelinesInfo(server, function(error, pipelinesInfo) {
            if (error) {
                return callback(error);
            }
            var pipelinesNumber = Object.keys(pipelinesInfo).length;
            if (!pipelinesNumber) {
                return callback('don\'t have any pipeline');
            } else {
                var idCounter = 0;
                for (idCounter = 0; idCounter < pipelinesNumber; idCounter++) {
                    _idList[idCounter] = pipelinesInfo[idCounter]["id"];
                }
                return callback(JSON.stringify(_idList, null, 1));
            }
        });
    })
}

function getFullInfoById(server, num, callback) {
    if (!server) {
        return callback('error - failed to find server');
    }
    server.getInfo(function(error, serverInfo) {
        if (error) {
            return callback(error);
        }

        getPipelinesInfo(server, function(error, pipelinesInfo) {
            if (error) {
                return callback(error);
            }
            var pipelinesNumber = Object.keys(pipelinesInfo).length;

            if (num > pipelinesNumber - 1) {
                return callback('number invalid');
            } else {
                serverInfo.pipelines = pipelinesInfo;
                return callback(JSON.stringify(serverInfo.pipelines[num], null, 1));
            }
        });
    })
}

function getInfo(server, callback) {
    if (!server) {
        return callback('error - failed to find server');
    }

    server.getInfo(function(error, serverInfo) {
        if (error) {
            return callback(error);
        }

        getPipelinesInfo(server, function(error, pipelinesInfo) {
            if (error) {
                return callback(error);
            }

            var pipelinesNumber = Object.keys(pipelinesInfo).length;

            //add pipeline info to server info
            serverInfo.pipelinesNumber = pipelinesNumber;
            serverInfo.pipelines = pipelinesInfo;
            // serverInfo.id = id;
            return callback(JSON.stringify(serverInfo.pipelines, null, 1));
            // }
        });
    })
}

function getNumPipe(server, callback) {
    if (!server) {
        return callback('error - failed to find server');
    }

    server.getInfo(function(error, serverInfo) {
        if (error) {
            return callback(error);
        }

        getPipelinesInfo(server, function(error, pipelinesInfo) {
            if (error) {
                return callback(error);
            }

            var pipelinesNumber = Object.keys(pipelinesInfo).length;
            return callback(pipelinesNumber);
        });
    })
}

function releasePipeline(server, num, callback) {
    if (!server) {
        return callback('error - failed to find server');
    }
    server.getInfo(function(error, serverInfo) {
        if (error) {
            return callback(error);
        }

        getPipelinesInfo(server, function(error, pipelinesInfo) {
            if (error) {
                return callback(error);
            }
            var pipelinesNumber = Object.keys(pipelinesInfo).length;

            if (num > pipelinesNumber - 1) {
                return callback('number invalid');
            } else {
                pipelinesInfo[num].release();
                return callback("Released pipeline");
            }  
            // serverInfo.pipeline = pipelinesInfo[num];
            // return callback(JSON.stringify(pipelinesInfo[num],null,1));
        });
    })
}

// stop
function stop(error) {
    if (kurentoClient) {
        kurentoClient.close();
    }
    process.exit(0);
}

process.on('SIGINT', stop);

var menuHandler;

// Initialize
function initialize(server) {
    showMenu();
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', checkMenu);

    function checkMenu() {
        var input = process.stdin.read();
        if(input !== null) {
            menuHandler(input.trim(), server);
        }
    }
}

// handle menu
function showMenu() {
    console.log(
      "\nPlease Choose an option:\n"
          + "1) List ID pipeline\n"
          + "2) Show Pineline By ID\n"
          + "3) Number of pipelines\n"
          + "4) Show all pipelines\n"
          + "5) Kill a pipeline\n"
          + "6) Info Kurento Server\n"
          + "7) Active Sessions \n"
          + "8) Exit\n"
        );

    menuHandler = function(input, server){
        if(input == 1) {
            console.log("List Pipelines: ");
            getListId(server, function(data) {
                console.log(data);                           
            });
            setTimeout(function () {
                showMenu();
            }, 500);
        } else if(input == '2'){
                waitPipeline2Show(server);
        } else if(input == '3'){
            getNumPipe(server, function(data) {
                console.log("Number of pipeline: " + data);
            });
            setTimeout(function () {
                showMenu();
            }, 500);
        } else if(input == '4'){
            getInfo(server, function(data) {
                console.log(data);
            });
            setTimeout(function () {
                showMenu();
            }, 500);
        } else if(input == '5'){
                waitPipeline2Kill(server);
        } else if(input == '6') {
            getInfoKurentoServer(server, function(data) {
                console.log(data);
            });
            setTimeout(function () {
                showMenu();
            }, 500);
        } else if(input == '7'){
            getSessionsInfo(server, function(data) {
                console.log(data);
            });
            setTimeout(function () {
                showMenu();
            }, 500);
        } else if(input == '8'){
            stop();
            // process.exit();
            
        } else {
             showMenu();
        }
    };
}

// Sub choose
function waitPipeline2Show(server) {
    console.log(
        'back = Go back to main'  + '\n\n' +
        'Choose a pipeline to show, then press ENTER:'
        );

    menuHandler = function(input){
      console.log("Info about pipeline ", input);
        if(input == 'back') {
          showMenu();
        } else {
            getFullInfoById(server, input, function(data) {
                console.log(data);
            });
        }
    };
}

// Sub choose
function waitPipeline2Kill(server) {
    console.log(
        'back = Go back to main'  + '\n\n' +
        'Choose a pipeline to kill, then press ENTER:'
        );

    menuHandler = function(input){
        // console.log("input la ", input);
        if(input == 'back') {
          showMenu();
        } else {
            releasePipeline(server, input, function(data) {
                console.log(data);
            });
        }
    };
}

function start() {

    getKurentoClient(function(error, kurentoClient) {
        if (error) {
            console.log('Failed load kurento client. ' + error);
            return callback(error);
        }

        // Get a reference to the current Kurento Media Server we are connected
        kurentoClient.getServerManager(function(error, server) {
            if (error) {
                console.log(error);
                process.exit(1);
            }
            initialize(server);           
        });        
    });
}

start();
