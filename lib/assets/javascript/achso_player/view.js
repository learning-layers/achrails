
AchSoPlayer.prototype.fetchElements = function(root) {
    this.elements = {
        root: root,
        video: root.querySelector(".acp-video"),
        videoWrapper: root.querySelector(".acp-video-wrapper"),
        videoBackground: root.querySelector(".acp-video-background"),
        playButton: root.querySelector(".acp-play-button"),
        seekBar: root.querySelector(".acp-seek-bar"),
        seekBarFiller: root.querySelector(".acp-seek-bar-filler"),
        seekCatcher: root.querySelector(".acp-seek-catcher"),
        waitBar: root.querySelector(".acp-wait-bar"),
        waitFade: root.querySelector(".acp-wait-fade"),
        annotationEdit: root.querySelector(".acp-annotation-edit"),
        annotationTextInput: root.querySelector(".acp-annotation-text-input"),
        annotationSaveButton: root.querySelector(".acp-annotation-save-button"),
        annotationDeleteButton: root.querySelector(".acp-annotation-delete-button"),
        subtitles: root.querySelector(".acp-subtitles"),
    };
};

AchSoPlayer.prototype.startView = function(rootElement, data) {
    this.fetchElements(rootElement);

    var player = this;

    this.doingWaitAnimation = false;

    // Video player
    this.elements.video.addEventListener("loadedmetadata", function() {
        var width = player.elements.video.videoWidth;
        var height = player.elements.video.videoHeight;
        player.setVideoSize(width, height);
    });
    this.elements.video.addEventListener("durationchange", function() {
        player.videoDuration = player.elements.video.duration;
        player.updateSeekBarView();
    });
    this.elements.video.addEventListener("timeupdate", function() {
        player.timeUpdate(player.elements.video.currentTime);
    });
    // @BrowserHack(Firefox): Seeking when paused results in black frames
    // sometimes with Firefox so force repaint the video on seek.
    if (/firefox/i.test(navigator.userAgent)) {
        this.elements.video.addEventListener("seeked", function() {
            player.elements.video.style.display = "inline";
            player.elements.video.offsetHeight;
            player.elements.video.style.display = "block";
        });
    }

    // Video controls
    this.elements.playButton.addEventListener("click", function() {
        player.userPlay();
    });
    relativeClickHandler(this.elements.seekCatcher, function(state, pos) {
        player.userSeek(pos.x * player.videoDuration, state);
    });

    // Annotation dragging controls
    relativeClickHandler(this.elements.video, function(state, pos) {
        var e = { state: state, pos: pos };
        player.editAnnotation(e);
    });

    // Annotation edit controls
    this.elements.annotationTextInput.addEventListener("input", function() {
        player.annotationTextInput(player.elements.annotationTextInput.value);
    });
    this.elements.annotationSaveButton.addEventListener("click", function() {
        player.annotationSaveButton();
    });
    this.elements.annotationDeleteButton.addEventListener("click", function() {
        player.annotationDeleteButton();
    });

    // Resize the video container every now and then (there isn't really any
    // portable resize event)
    this.videoWrapperResizeinterval = window.setInterval(function() {
        player.updateVideoWrapperSize();
    }, 500);

    // Annotation view
    this.annotationView = new DomView({
        container: this.elements.videoWrapper,
        newElement: function() {
            return elemWithClasses('div', 'acp-annotation');
        },
        toElement: function(element, annotation) {
            if (annotation == player.selectedAnnotation) {
                element.classList.add("acp-selected-annotation");
            } else {
                element.classList.remove("acp-selected-annotation");
            }
            element.style.left = cssPercent(annotation.pos.x);
            element.style.top = cssPercent(annotation.pos.y);
        },
    });

    // Seek bar view
    this.seekBarView = new DomView({
        container: this.elements.seekBar,
        newElement: function() {
            return elemWithClasses('div', 'acp-seek-annotation');
        },
        toElement: function(element, batch) {
            if (this.state == AnnotationPause) {
                element.classList.add("waiting");
            } else {
                element.classList.remove("waiting");
            }
            element.style.left = cssPercent(batch.time / this.videoDuration);
        }.bind(this),
    });

    this.elements.video.src = data.videoUri;
};

AchSoPlayer.prototype.stopView = function() {
    window.clearInterval(this.videoWrapperResizeInterval);
};

AchSoPlayer.prototype.setBarPosition = function(time) {
    this.lastBarPosition = time;
    this.elements.seekBarFiller.style.width = cssPercent(time / this.videoDuration);
};

AchSoPlayer.prototype.setVideoSize = function(width, height) {
    this.videoWidth = width;
    this.videoHeight = height;
    this.videoAspect = width / height;

    this.updateVideoWrapperSize();
};

AchSoPlayer.prototype.updateVideoWrapperSize = function(width, height) {
    if (!this.videoAspect)
        return;

    var bgWidth = this.elements.videoBackground.clientWidth;
    var bgHeight = this.elements.videoBackground.clientHeight;
    var bgAspect = bgWidth / bgHeight;

    // Scale the video so that it always fills one dimension of the container
    if (this.videoAspect >= bgAspect) {
        // Video is more horizontal than the container, use container width.
        this.playerWidth = bgWidth;
        this.playerHeight = this.playerWidth / this.videoAspect;
    } else {
        // Video is more vertical than the container, use container height.
        this.playerHeight = bgHeight;
        this.playerWidth = this.playerHeight * this.videoAspect;
    }

    this.elements.videoWrapper.style.width = this.playerWidth + "px";
    this.elements.videoWrapper.style.height = this.playerHeight + "px";
};

AchSoPlayer.prototype.pauseVideo = function() {
    this.elements.video.pause();
};

AchSoPlayer.prototype.playVideo = function() {
    this.elements.video.play();
};

AchSoPlayer.prototype.seekVideo = function(time) {
    this.elements.video.currentTime = time;
};

AchSoPlayer.prototype.setPlayButton = function(isPlay) {
    var button = this.elements.playButton;
    if (isPlay) {
        button.innerHTML = "&#xE037;";
    } else {
        button.innerHTML = "&#xE034;";
    }
};

AchSoPlayer.prototype.showAnnotationEdit = function(annotation) {
    this.elements.subtitles.classList.add("hidden");
    this.elements.annotationEdit.classList.add("visible");
    this.elements.annotationTextInput.value = annotation.text;
};

AchSoPlayer.prototype.hideAnnotationEdit = function() {
    this.elements.subtitles.classList.remove("hidden");
    this.elements.annotationEdit.classList.remove("visible");
    this.elements.annotationEdit.classList.remove("transparent");
    this.elements.annotationTextInput.blur();
};

AchSoPlayer.prototype.annotationDragStop = function() {
    this.elements.annotationEdit.classList.remove("transparent");
    this.elements.seekCatcher.classList.remove("disable");
};

AchSoPlayer.prototype.annotationDragStart = function() {
    this.elements.annotationEdit.classList.add("transparent");
    this.elements.seekCatcher.classList.add("disable");
};

AchSoPlayer.prototype.updateAnnotationView = function() {
    var annotations;
    if (this.batch) {
        annotations = this.batch.annotations;
    } else {
        annotations = [];
    }

    this.annotationView.update(annotations);

    var subtitleList = [];
    for (var i = 0; i < annotations.length; i++) {
        var annotationText = annotations[i].text.trim();
        if (annotationText != "") {
            subtitleList.push(annotationText);
        }
    }
    var subtitleText = subtitleList.join("\n");
    this.elements.subtitles.innerHTML = stringToHTMLSafe(subtitleText);
};

AchSoPlayer.prototype.updateSeekBarView = function() {
    this.seekBarView.update(this.batches);
};

AchSoPlayer.prototype.doWaitAnimation = function(time) {
    this.doingWaitAnimation = true;
    this.waitAnimationStart = getTimeSeconds();
    this.waitAnimationDuration = time;

    this.elements.waitFade.style.transition = "";
    this.elements.waitFade.style.width = '0%';
    this.elements.waitFade.style.opacity = '1.0';

    this.elements.waitBar.style.transition = "width " + time + "s linear";
    this.elements.waitBar.style.width = "100%";
};

AchSoPlayer.prototype.stopWaitAnimation = function() {
    if (!this.doingWaitAnimation)
        return;
    this.doingWaitAnimation = false;

    var time = getTimeSeconds();
    var delta = time - this.waitAnimationStart;
    var length = Math.min(delta / this.waitAnimationDuration, 1.0);

    this.elements.waitBar.style.transition = "";
    this.elements.waitBar.style.width = "0%";

    this.elements.waitFade.style.transition = "opacity 0.2s ease-out";
    this.elements.waitFade.style.width = cssPercent(length);
    this.elements.waitFade.style.opacity = '0.0';
};
