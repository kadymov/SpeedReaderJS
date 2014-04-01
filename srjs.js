/*
    SpeedReaderJS - Library for speed reading
    License - https://github.com/kadymov/SpeedReaderJS/LICENSE.md
    Copyright (c) 2014 Aleksandr Kadymov (www.kadymov.pw)
*/

(function (window, undefined) {
    'use strict';

    /*                     Configuration Manager
     ********************************************************************/

    var Configuration = (function () {
    
        var
            // Constants
            INT_NAME = 'speedReader',

            // Private variables
            settings = {
                formTop         : 0,
                formLeft        : 0,
                dockingBottom   : false,
                dockingRight    : false,
                formWidth       : 260
            };

        /* Private methods */

        function save() {
            var set = JSON.stringify(settings);
            window.sessionStorage.setItem(INT_NAME, set);
        }

        function load() {
            var set = window.sessionStorage.getItem(INT_NAME);
            if (!set) {
                save();
                return;
            }

            settings = JSON.parse(set);
        }

        /* Public methods */

        return {
            getOption : function (optName) {
                load();
                return settings[optName];
            },

            setOption : function (optName, value) {
                if (Object.prototype.toString.call(optName) === '[object Object]') {

                    for (var o in optName) {
                        if (!!optName.hasOwnProperty(o)) {
                            settings[o] = optName[o];
                        }
                    }
                } else {
                    settings[optName] = value;
                }

                save();
            }
        };
    })();

    /*                            Canvas Manager
     ********************************************************************/

    var Output = (function() {
        var
            // Constants
            LR_MARGIN       = 10,
            CANV_RATIO      = 0.2,

            // Private variables
            canvas          = null,
            ctx             = null,
            width           = 0,
            height          = 0,
            fontSize        = 0,
            actText         = '';

        /* Private methods */

        function drawBg() {
            var vLineLeft = LR_MARGIN,
                vLineRight = width - LR_MARGIN,
                
                halfTextHeight = fontSize / 2 + 10,
                vertCenter = height / 2,
                vTopLineY = vertCenter - halfTextHeight,
                vBotLineY = vertCenter + halfTextHeight,
                
                centerLineX = (width - LR_MARGIN * 2) / 3;
            
            ctx.save();
            ctx.clearRect(0, 0, width, height);
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(vLineLeft, vTopLineY);
            ctx.lineTo(vLineRight, vTopLineY);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(vLineLeft, vBotLineY);
            ctx.lineTo(vLineRight, vBotLineY);
            ctx.stroke();
               
            ctx.beginPath();
            ctx.moveTo(centerLineX, vTopLineY);
            ctx.lineTo(centerLineX, vBotLineY);
            ctx.stroke();
            
            clearText();
        }

        function clearText() {
            var vertCenter = height / 2,
                halfTextHeight = fontSize / 2 + 10,

                vTopLineY = vertCenter - halfTextHeight,
                vBotLineY = vertCenter + halfTextHeight,
                
                marg = 5;
        
            ctx.clearRect(0, vTopLineY + marg,
                width, vBotLineY - vTopLineY - marg*2);
        }

        function drawText(text) {
            if (!text) return;

            actText = text;

            var
                len = text.length,
                letter = len == 1 ? 0 : len < 6 ? 1 : len < 10 ? 2 : len < 14 ? 3 : 4,
                                   
                vertCenter = height / 2,
                centerLineX = (width - LR_MARGIN * 2) / 3;
            
            clearText();
            
            ctx.save();
            
            ctx.font = fontSize + 'px Arial';
            ctx.textBaseline = 'middle';
            
            var cLetter = text.charAt(letter),
                cLetterWidth = ctx.measureText(cLetter).width,
                cLetterX = centerLineX - cLetterWidth / 2,
            
                lText = text.substring(0, letter),
                lTextX = cLetterX - ctx.measureText(lText).width,
                
                rText = text.substring(letter+1),
                rTextX = cLetterX + cLetterWidth;
            
           
            ctx.fillText(lText, lTextX, vertCenter);
            ctx.fillText(rText, rTextX, vertCenter);
            ctx.fillStyle = 'red';
            ctx.fillText(cLetter, cLetterX, vertCenter);
            
            ctx.restore();
        }

        /* Public methods */

        return {
            init : function (canv) {
                canvas = canv;

                var compStyle = document.defaultView.getComputedStyle(canv);
                width = parseInt(compStyle.width, 10);
                height = width * CANV_RATIO;

                canvas.style.height = height + 'px';

                canvas.width = width;
                canvas.height = height;
                
                ctx = canvas.getContext('2d');

                fontSize = width / 15;

                drawBg();
            },

            resize : function (w) {
                width = w;
                height = w * CANV_RATIO;

                canvas.style.height = height + 'px';
                canvas.width = width;
                canvas.height = height;
               
                fontSize = width / 15;
                                
                drawBg();
                drawText(actText);
            },

            drawText : drawText
        };
    })();

    /*                           Reader Manager
     ********************************************************************/

    var Reader = (function () {
        var
            // Constants
            SHORT_DELAY     = 1.9,
            LONG_DELAY      = 2.4,

            // Private variables
            textArr         = null,
            wordId          = 0,
            wordsCount       = 0,

            viewer          = null,
            speed           = 60000 / 250,
            play            = false,

            finishPlayingHandler = null,
            nextWordHandler = null;

        /* Private methods */

        function nextWord() {
            return textArr[wordId++];
        }

        function getDelayVal(word) {
            var lastChar = word.charAt(word.length-1);
            switch (lastChar) {
                case ',' :
                case ';' :
                    return speed * SHORT_DELAY;
                case '.' :
                case '?' :
                case '!' :
                    return speed * LONG_DELAY;
                default:
                    return speed;
            }
        }

        function timeoutFunc() {
            if (!play) return;
            var word = nextWord();
            
            if (word === undefined) {
                play = false;
                wordId = 0;

                if (!!finishPlayingHandler) finishPlayingHandler();

                return;
            }
            
            var delay = getDelayVal(word);
            
            viewer.drawText(word);

            if (!!nextWordHandler) nextWordHandler(wordId, wordsCount);
            
            setTimeout(function(){timeoutFunc();}, delay);
        }

        /* Public methods */

        return {
            init : function (out, onFinishPlaying, onNextWord) {
                viewer = out;
                finishPlayingHandler = onFinishPlaying;
                nextWordHandler = onNextWord;
            },

            loadText : function (text) {
                this.stop();
                textArr = text.split(/[\s\r\n\t]/);
                wordsCount = textArr.length;
            },

            play : function () {
                if (play || !textArr || !textArr.length) return;
                play = true;
                timeoutFunc();
            },

            pause : function () {
                play = false;
            },

            stop : function () {
                play = false;
                wordId = 0;
            },

            back : function () {
                if (!textArr || !textArr.length) return;

                this.pause();

                wordId -= 10;
                if (wordId < 0) wordId = 0;

                viewer.drawText(nextWord());
                var that = this;
                setTimeout(function(){that.play();}, 1000);
            },

            setSpeed : function (val) {
                speed = 60000 / val;
            },


            isPlay : function () {
                return play;
            },

            getWordId : function () {
                return wordId;
            },

            setWordId : function (id) {
                if (!textArr || !textArr.length) return false;

                wordId = id;
                viewer.drawText(textArr[id]);

                return true;
            },

            getWordsCount : function () {
                return wordsCount;
            }

        };
    })();

    /*                      Form Manager
     ********************************************************************/

    var ReaderForm = (function () {
        var
            // Constants
            CAPTION_STR = 'SpeedReader.JS',
            SPEED       = [250, 300, 350, 400, 450, 500, 550, 600,
                             650, 700, 750, 800, 850, 900, 950, 1000];

        /* Private methods */

        function createEl(tagName, className, html, title) {
            var el = document.createElement(tagName);

            if (className !== undefined) {
                el.className = className;
            }

            if (html !== undefined) {
                el.innerHTML = html;
            }

            if (title !== undefined) {
                el.setAttribute('title', title);
            }

            return el;
        }

        function makeMovable(form, anchor, onStartMoving, onMoving, onEndMoving) {
            var startX      = 0,
                startY      = 0,
                startLeft   = 0,
                startTop    = 0,

                compStyle   = document.defaultView.getComputedStyle(form),

                eventObj    = {
                    left : compStyle.left,
                    top : compStyle.top
                };

            function onMouseDown(e) {
                    document.body.classList.add('selection-off');

                    var compStyle = document.defaultView.getComputedStyle(form),
                        documentEl = document.documentElement;

                    startLeft = parseInt(compStyle.left, 10);
                    startTop = parseInt(compStyle.top, 10);

                    startX = e.clientX;
                    startY = e.clientY;

                    documentEl.addEventListener('mousemove', onMouseMove, false);
                    documentEl.addEventListener('mouseup', onMouseUp, false);

                    if (onStartMoving !== undefined) {
                        onStartMoving.call(form, eventObj);
                    }
                }

                function onMouseMove(e) {
                    eventObj.left = startLeft + e.clientX - startX;
                    eventObj.top = startTop + e.clientY - startY;

                    if (onMoving !== undefined) {
                        onMoving.call(form, eventObj);
                    }

                    form.style.left = eventObj.left + 'px';
                    form.style.top = eventObj.top + 'px';
                }

                function onMouseUp() {
                    document.body.classList.remove('selection-off');

                    var documentEl = document.documentElement;

                    documentEl.removeEventListener('mousemove', onMouseMove, false);
                    documentEl.removeEventListener('mouseup', onMouseDown, false);

                    if (onEndMoving !== undefined) {
                        onEndMoving.call(form, eventObj);
                    }
                }

                anchor.addEventListener('mousedown', onMouseDown, false);
        }

        function makeResizable(form, anchor, onResize, onEndResize) {
            var MIN_WIDTH   = 260,
                startX      = 0,
                startWidth  = 0,
                ratio       = 0,
                width       = 0;

            function mouseDown(e) {
                document.body.classList.add('selection-off');

                var compStyle = document.defaultView.getComputedStyle(form);
                startX = e.clientX;
                startWidth = parseInt(compStyle.width, 10);
                ratio = parseInt(compStyle.height, 10) / startWidth;

                document.documentElement.addEventListener('mouseup', mouseUp, false);
                document.documentElement.addEventListener('mousemove', mouseMove, false);
            }

            function mouseMove(e) {
                var newWidth = startWidth + e.clientX - startX;
                newWidth = newWidth < MIN_WIDTH ?
                    MIN_WIDTH : newWidth > window.innerWidth - 30 ?
                    window.innerWidth - 30 : newWidth;

                form.style.width =  newWidth + 'px';
                width = newWidth;

                if (onResize !== undefined) {
                    onResize(newWidth);
                }
            }

            function mouseUp() {
                document.body.classList.remove('selection-off');

                document.documentElement.removeEventListener('mousemove', mouseMove, false);
                document.documentElement.removeEventListener('mouseup', mouseUp, false);

                if (onEndResize !== undefined) {
                    onEndResize(width);
                }
            }

            anchor.addEventListener('mousedown', mouseDown, false);
        }

        /* ProgressBar Class */

        function ProgressBar(onChange) {
            var changeHandler   = onChange,
                pbar            = createEl('div', 'speed-reader-pbar', undefined, 'Progress'),
                prun            = createEl('div', 'speed-reader-prun'),
                value           = 0,
                documentEl      = document.documentElement,

                setPos          = function (e) {
                    var x       = e.pageX - pbar.getBoundingClientRect().left,
                        maxW    = parseInt(document.defaultView.getComputedStyle(pbar).width, 10);

                    value = parseInt(x / (maxW / 100), 10);
                    prun.style.width = value + '%';
                },


                onMouseDown     = function(e) {
                    document.body.classList.add('selection-off');

                    setPos(e);
                    documentEl.addEventListener('mousemove', onMouseMove, false);
                    documentEl.addEventListener('mouseup', onMouseUp, false);
                    if (!!changeHandler) changeHandler(value);
                },

                onMouseMove     = function(e) {
                    setPos(e);
                    if (!!changeHandler) changeHandler(value);
                },

                onMouseUp   = function() {
                    document.body.classList.remove('selection-off');

                    documentEl.removeEventListener('mousemove', onMouseMove, false);
                    documentEl.removeEventListener('mouseup', onMouseUp, false);
                };

            pbar.appendChild(prun);
            pbar.addEventListener('mousedown', onMouseDown, false);

            return {
                val : function (val) {
                    if (val === undefined) {
                        return value;
                    } else {
                        value = val;
                        prun.style.width = value + '%';
                    }
                },

                setListener : function (func) {
                    changeHandler = func;
                },

                getElem : function () {
                    return pbar;
                }
            };
        }




        /*********************/

        function openInfoPopup() {
            var width = 300,
                height = 220,

                win = window.open('', 'Information', 'width=' + width + ',height=' + height +
                    ',left=' + ((window.innerWidth - width)/2) + ',top=' + ((window.innerHeight - height)/2) +
                    'menubar=no,toolbar=no,location=no,directories=no,status=false,resizable=no, scrollbars=yes'),

                html = '<style>body {font: 14px/14px Arial; padding: 5px; text-align:center;background:#eee}a{background: #ddd; padding: 3px; border-radius:3px;}</style>'+
                        '<h1>SpeedReader.JS</h1>'+
                        '<p>Author: Alexandr Kadymov</p>'+
                        '<p><a href="http://kadymov.pw" target="_blank">www.kadymov.pw</a></p>'+
                        '<p><a href="https://github.com/kadymov/SpeedReaderJS" target="_blank">GitHub Repo</a></p>'+
                        '<h2>Instructions</h2>'+
                        '1) Select text<br/>2) Press play';

                win.document.body.innerHTML = html;
                win.focus();
        }

        function createForm() {
            var form        = createEl('div', 'speed-reader'),
                caption     = createEl('div',
                    'speed-reader-caption', CAPTION_STR),

                infBut      = createEl('div',
                    'speed-reader-infbut', undefined, 'Information'),

                fullBut     = createEl('div',
                    'speed-reader-fullbut', undefined, 'Full screen mode'),

                panel       = createEl('ul', 'speed-reader-panel'),

                playBut     = createEl('li',
                    'speed-reader-button play', '&nbsp;', 'Play/Pause'),

                stopBut     = createEl('li',
                    'speed-reader-button stop', '&nbsp;', 'Stop'),

                backBut     = createEl('li',
                    'speed-reader-button back', '&nbsp;', 'Back'),

                speedLi     = createEl('li', undefined, 'Speed: '),

                speedStr    = '<option>' + SPEED.join(' pws</option><option>') +
                                ' pws</option>',

                speedSel    = createEl('select', 'speed-reader-spdsel', speedStr),

                resizeAnchor = createEl('div', 'speed-reader-resizer'),

                canv = createEl('canvas', 'speed-reader-canv'),

                progressBar = new ProgressBar();


            caption.appendChild(fullBut);
            caption.appendChild(infBut);
            speedLi.appendChild(speedSel);

            panel.appendChild(playBut);
            panel.appendChild(stopBut);
            panel.appendChild(backBut);
            panel.appendChild(speedLi);

            form.appendChild(caption);
            form.appendChild(canv);
            form.appendChild(progressBar.getElem());
            form.appendChild(panel);
            form.appendChild(resizeAnchor);

            /** Events **/

            function onWindowKeyPress (e) {
                if(e.which === 27) {
                    form.classList.remove('full-scr');
                    document.body.classList.remove('scroll-off');
                    var compStyle = document.defaultView.getComputedStyle(form);
                    Output.resize(parseInt(compStyle.width, 10), parseInt(compStyle.height, 10));

                    window.removeEventListener('keydown', onWindowKeyPress, false);
                }
            }

            fullBut.addEventListener('click', function() {
                form.classList.toggle('full-scr');
                document.body.classList.toggle('scroll-off');
                var compStyle = document.defaultView.getComputedStyle(form);
                Output.resize(parseInt(compStyle.width, 10), parseInt(compStyle.height, 10));

                window.addEventListener('keydown', onWindowKeyPress, false);
            });

            infBut.addEventListener('click', function() {
                openInfoPopup();
            });

            /************/

            return {
                form    : form,
                capt    : caption,
                play    : playBut,
                stop    : stopBut,
                back    : backBut,
                full    : fullBut,
                spd     : speedSel,
                resize  : resizeAnchor,
                canv    : canv,
                pbar    : progressBar
            };
        }

        function setPosition(form) {
            var formLeft    = Configuration.getOption('formLeft'),
                formTop     = Configuration.getOption('formTop'),

                calcWidth   = parseInt(document.defaultView.getComputedStyle(form).width, 10),
                formWidth   = Configuration.getOption('formWidth');

            Output.resize(calcWidth === window.innerWidth ? calcWidth : formWidth);

            if (!!Configuration.getOption('dockingRight')) {
                formLeft = window.innerWidth - formWidth;
            }

            if (!!Configuration.getOption('dockingBottom')) {
                var compStyle   = document.defaultView.getComputedStyle(form);
                formTop = window.innerHeight - parseInt(compStyle.height, 10);
            }

            form.style.width = formWidth;
            form.style.left = formLeft + 'px';
            form.style.top  = formTop + 'px';

            Configuration.setOption({
                'formLeft' : formLeft,
                'formTop' : formTop
            });
        }

        function readerInit(form) {
            var selectionText = '';

            Output.init(form.canv);
            Reader.init(Output, function () {
                form.play.classList.remove('pause');
            }, function (wordId, count) {
                var val = parseInt(wordId / (count / 100), 10);
                form.pbar.val(val);
            });

            form.play.addEventListener('click', function(e) {
                if (Reader.isPlay()) {
                    Reader.pause();
                    e.target.classList.remove('pause');

                } else {
                    var sel = window.getSelection().toString();

                    if (!!sel.length && selectionText !== sel) {
                        Reader.loadText(sel);
                        selectionText = sel;
                    }

                    if (!selectionText.length) return;

                    Reader.play();
                    e.target.classList.add('pause');
                }
            }, false);

            form.stop.addEventListener('click', function() {
                Reader.stop();
                form.pbar.val(0);
                form.play.classList.remove('pause');
            }, false);

            form.back.addEventListener('click', function() {
                Reader.back();
            }, false);

            form.spd.addEventListener('change', function (e) {
                var speed = parseInt(e.target.value, 10);
                Reader.setSpeed(speed);
            });

            form.pbar.setListener(function(val) {
                var wordsCount = Reader.getWordsCount(),
                    wordId = parseInt(wordsCount / 100 * val, 10);

                Reader.setWordId(wordId);
            });
        }

        function init() {
            // Creating a form
            var form = createForm(),

            // The logic of moving form

                dockingBottom   = false,
                dockingRight    = false,

                onMoveHandler   = function (e) {
                    var MIN_DIST        = 20,
                        left            = e.left,
                        top             = e.top,

                        compStyle       = document.defaultView.getComputedStyle(this),
                        width           = parseInt(compStyle.width, 10),
                        height          = parseInt(compStyle.height, 10),
                        browserWidth    = window.innerWidth,
                        browserHeight   = window.innerHeight;

                    dockingBottom = false;
                    dockingRight = false;

                    if (top < MIN_DIST) {
                        top = 0;
                    }

                    if (top + height > browserHeight - MIN_DIST) {
                        top = browserHeight - height;
                        dockingBottom = true;
                    }

                    if (left < MIN_DIST) {
                        left = 0;
                    }

                    if (left + width > browserWidth - MIN_DIST) {
                        left = browserWidth - width;
                        dockingRight = true;
                    }

                    e.left = left;
                    e.top = top;
                },

                onEndMovingHandler = function (e)  {
                    Configuration.setOption({
                        'formLeft'      : e.left,
                        'formTop'       : e.top,
                        'dockingBottom' : dockingBottom,
                        'dockingRight'  : dockingRight
                    });
                };

            makeMovable(form.form, form.capt, undefined, onMoveHandler, onEndMovingHandler);

            // The logic of resizing form

            makeResizable(form.form, form.resize, function (width) {
                Output.resize(width);
            }, function (width) {
                Configuration.setOption('formWidth', width);
            });

            // Reader configuration
            readerInit(form);


            // Adding the form to document

            document.body.appendChild(form.form);
            setPosition(form.form);

            window.addEventListener('resize', function () {
                setPosition(form.form);
            }, false);


            return form;
        }

        var pluginForm = null;

        /* Public methods */

        return {
            show : function () {
                if (!pluginForm) {
                    pluginForm = init();
                }

                pluginForm.form.style.diplay = 'block';
            },

            hide : function () {
                if (!!pluginForm && !!pluginForm.form) {
                    pluginForm.form.style.diplay = 'none';
                }
            }
        };
    })();


    var wasLoaded = false,
        wasInit = false;

    function runAfterLoading(func) {
        if (!func) return;

        if (wasLoaded) {
            func();
            wasInit = true;
        } else {
            window.addEventListener('DOMContentLoaded', function () {
                func();
                wasInit = true;
            }, false);
        }
    }

    var oldGlobalVar = window.srjs,
        srjs = {
            show : function () {
                runAfterLoading(ReaderForm.show);
            },

            hide : function () {
                if (!wasInit) return;

                Reader.stop();
                ReaderForm.hide();
            },

            noConflict : function () {
                if (window.srjs === srjs) {
                    window.srjs = oldGlobalVar;
                }
                return srjs;
            }
        };

    window.srjs = srjs;

})(window);