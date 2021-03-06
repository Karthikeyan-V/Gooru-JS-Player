/* Created by Gooru on 2014
 * Copyright (c) 2014 Gooru. All rights reserved.
 * http://www.goorulearning.org/
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var collectionPlay = {
  init: function(data) {
    EJS.ext = '.template';
    var param = helper.getRequestParam();
    if (typeof(param.session_token) != 'undefined' && param.session_token != '') {
      USER.sessionToken = param.session_token;
    } else if(typeof(data) != 'undefined') {
      USER.sessionToken = data.token;
    }
    $.ajaxSetup({data: {sessionToken: USER.sessionToken}}); 
    $('#gooru-collection-player-base-container').bind('activity.log',function(e, section, options){
      activityLog.init(options);
    });
    USER.gooruUid = helper.getGooruUidWithToken(USER.sessionToken);
    collectionPlay.showCollectionPlayCoverPage(helper.getRequestParam());
  },
  showCollectionPlayCoverPage: function(param) { 
    if (typeof(param.id) === 'undefined' || param.id === '') { 
      var collectionInfo = new EJS({url: '/templates/collection/collectionPlayerInfo.template'}).render({message: 'Please provide collection Id', reduceSize: 0});
      $('div#gooru-collection-player-base-container').html(collectionInfo).css('height', $(window).height()); 
      return;
    }
    var url = GOORU_REST_ENDPOINT + '/v2/collection/' + param.id + '/?includeCollectionItem=true&includeMetaInfo=true';
    $.ajax({
      type: 'GET',
      url: url,
      dataType: 'jsonp',
      success: function (data) {
	if(data.collectionType == 'collection') {
	  collectionPlay.renderCollectionPlayer(data, param);
	} else {
	  this.error(data);
	}
      },
      error : function(data) {
	  var resourceInfo = new EJS({url: '/templates/resources/resourcePlayerInfo.template'}).render({message: 'Collection Not Found, Please check the collection Id - ' + param.id, reduceSize: 0});
          $('div#gooru-collection-player-base-container').html(resourceInfo); 
      }
    });
  },
  renderCollectionPlayer: function(data, param) { 
    if (data.status == 404) {
      var collectionInfo = new EJS({url: '/templates/collection/collectionPlayerInfo.template'}).render({message: 'Collection Not Found, please check the collection Id - ' + param.id, reduceSize: 0});
      $('div#gooru-collection-player-base-container').html(collectionInfo); 
      return;
    } else if (data.status == 403) {
      var collectionInfo = new EJS({url: '/templates/collection/collectionPlayerInfo.template'}).render({message: "You don't have permission to play this collection", reduceSize: 0});
      $('div#gooru-collection-player-base-container').html(collectionInfo); 
      return;
    }
    document.title = data.title;
    $('div#gooru-collection-player-base-container').data('collectionId', data.gooruOid);
    $('div#gooru-collection-player-base-container').data('collectionOwnerId', data.user.gooruUId);
    $('div#gooru-collection-player-base-container').data('collectionOwnerName', data.user.usernameDisplay);
    
    var collectionPlayCoverPage = new EJS({url: '/templates/collection/collectionPlayerCoverPage.template'}).render({data:data});
    $('div#gooru-collection-player-base-container').html(collectionPlayCoverPage); 
    var collectionPlayMeta = new EJS({url: '/templates/collection/collectionPlayerMeta.template'}).render({data:data});
    $('div#gooru-collection-player-cover-page-meta-container').html(collectionPlayMeta); 
    var sessionIdForCollection = helper.getSessionIdForEvent($('div#gooru-collection-player-base-container').data('collectionId'),USER.sessionToken);
    var collectionSessionId = (typeof sessionIdForCollection != 'undefined' && sessionIdForCollection.length > 0) ? sessionIdForCollection : generateGUID();
    helper.roundedCornerForIE();
    helper.previewToolTip('.collection-play-standards-preview', 'top');
    collectionPlay.collectionPlayDialogBox('#collection-ack-dialog-container', 696,  true, $(window).height() - 100);
    collectionPlay.collectionPlayDialogBox('#collection-course-dialog-container', 400, true, 'auto');
    collectionPlay.collectionPlayDialogBox('#collection-voc-dialog-container', 400,  true, 'auto');
    collectionPlay.collectionPlayDialogBox('#collection-standards-dialog-container', 696, true, 'auto');
    collectionPlay.showCollectionPlayResourcePreview(data);
    $('div.collection-player-resource-content-val').attr("data-session-id",collectionSessionId.toUpperCase() );
    helper.sendCollectionLoadEventData(data.gooruOid,helper.getEventDataObject(),helper.getTimeInMilliSecond(),$('div.collection-player-resource-content-val').data("session-id"));
    collectionPlay.collectionSummaryPage(data);
    collectionPlay.collectionPlayEventHandle(data);
  },
  
  collectionPlayEventHandle: function(data) { 
    $('.collection-ack-seemore').click(function() { 
      $('#collection-ack-dialog-container').dialog('open');
      var collectionId =  $('div#gooru-collection-player-base-container').data('collectionId');
      collectionPlay.collectionPlayResourceAcknowledgment(collectionId);
    });
    $('.collection-course-seemore').click(function() { 
      $('#collection-course-dialog-container').dialog('open');
      var course = new EJS({url: '/templates/collection/collectionPlayercourse.template'}).render({course:data.metaInfo.course});
      $('div#collection-course-dialog-container').html(course);
      $('div.gooru-collection-player-course-button-okay').click(function() { 
	  $('#collection-course-dialog-container').dialog('close');
      });
    });
    $('.collection-voc-seemore').click(function() { 
	$('#collection-voc-dialog-container').dialog('open');
	var vocabulary = new EJS({url: '/templates/collection/collectionPlayerVocabulary.template'}).render({vocabulary:data.vocabulary});
	$('div#collection-voc-dialog-container').html(vocabulary);
	$('div.gooru-collection-player-voc-button-okay').click(function() { 
	    $('#collection-voc-dialog-container').dialog('close');
	});
    });
    $('.collection-standards-seemore').click(function() { 
	$('#collection-standards-dialog-container').dialog('open');
	var standards = new EJS({url : '/templates/collection/collectionPlayerStandards.template'}).render({data : data.metaInfo.standards});
	$('div#collection-standards-dialog-container').html(standards);
	$('div.gooru-collection-player-standards-button-okay').click(function() { 
	  $('#collection-standards-dialog-container').dialog('close');
	});
    });
    $('div#gooru-collection-player-cover-page-study-container').click(function() { 
      $('div.collection-player-resource-content-val').addClass("collection-init");
      $('div#gooru-collection-player-cover-page-container').hide();
      $('div#gooru-collection-player-resource-play-container').show();
      var views = $('div#collection-meta-analytic-view').data('views') + 1;
      $('div#collection-meta-analytic-view').data('views', views);
      var suffix = (views > 1) ? 's' : '';
      $('div#collection-meta-analytic-view').text(views + ' view' + suffix);
      var collectionId =  $('div#gooru-collection-player-base-container').data('collectionId');
      helper.updateResourceViews(collectionId, views);
      $('div#collection-segment-container').css('margin-left', '0px');
      var numberOfResourceDisplay = Math.floor($('div#collection-segment-base-container').width() / $('div.collection-segment-content:eq(0)').width());
      $('span.gooru-collection-player-resource-prev-arrow').hide();
      if ($('div.collection-segment-content').length > numberOfResourceDisplay) { 
	$('span.gooru-collection-player-resource-next-arrow').css('display', 'block');
      }
      $('div.collection-player-resource-content-val:eq(0)').trigger('click');
    });
    /* handle collection play menu events*/
    $('div#gooru-collection-player-nav-container').click(function() { 
        $('div#gooru-collection-player-narrative-menu-arrow, div#gooru-collection-player-info-menu-arrow, div#gooru-collection-player-resource-play-menu-narrative-container ,div#gooru-collection-player-resource-play-menu-info-container').hide();
        $('div.gooru-collection-player-info-menu-icon').removeClass('gooru-collection-player-menu-info-selected');
	$('div.gooru-collection-player-narrative-menu-icon').removeClass('gooru-collection-player-narrative-menu-icon-selected');
        $('div.gooru-collection-player-nav-menu-icon').toggleClass('gooru-collection-player-nav-menu-icon-selected');
	$('div#gooru-collection-player-resource-play-menu-nav-container').slideToggle('slow', function() {
	  resetResourcePreviewHeight(); 
	});
	if($('div#gooru-collection-player-nav-menu-arrow').is(':visible')) {
	  $('div#gooru-collection-player-nav-menu-arrow').hide();
	  $('div#gooru-collection-player-base-container').data('selected-menu', 'none');
	} else { 
	  $('div#gooru-collection-player-nav-menu-arrow').css('display', 'block');
	  $('div#gooru-collection-player-base-container').data('selected-menu', 'navigation');
	}
    });
    $('div#gooru-collection-player-info-container').click(function() { 
        $('div#gooru-collection-player-narrative-menu-arrow, div#gooru-collection-player-nav-menu-arrow, div#gooru-collection-player-resource-play-menu-narrative-container ,div#gooru-collection-player-resource-play-menu-nav-container').hide();
        $('div.gooru-collection-player-nav-menu-icon').removeClass('gooru-collection-player-nav-menu-icon-selected');
	$('div.gooru-collection-player-narrative-menu-icon').removeClass('gooru-collection-player-narrative-menu-icon-selected');
        $('div.gooru-collection-player-info-menu-icon').toggleClass('gooru-collection-player-menu-info-selected');
	$('div#gooru-collection-player-resource-play-menu-info-container').slideToggle('slow', function() {
	  resetResourcePreviewHeight(); 
	});
	if($('div#gooru-collection-player-info-menu-arrow').is(':visible')) {
	  $('div#gooru-collection-player-info-menu-arrow').hide();
	  $('div#gooru-collection-player-base-container').data('selected-menu', 'info');
	} else {
	  $('div#gooru-collection-player-info-menu-arrow').css('display', 'block');
	  $('div#gooru-collection-player-base-container').data('selected-menu', 'info');
	}
    });
    $('div#gooru-collection-player-narrative-container').click(function() { 
        $('div#gooru-collection-player-nav-menu-arrow, div#gooru-collection-player-info-menu-arrow, div#gooru-collection-player-resource-play-menu-nav-container ,div#gooru-collection-player-resource-play-menu-info-container').hide();
        $('div.gooru-collection-player-info-menu-icon').removeClass('gooru-collection-player-menu-info-selected');
	$('div.gooru-collection-player-nav-menu-icon').removeClass('gooru-collection-player-nav-menu-icon-selected');
        $('div.gooru-collection-player-narrative-menu-icon').toggleClass('gooru-collection-player-narrative-menu-icon-selected');
	$('div#gooru-collection-player-resource-play-menu-narrative-container').slideToggle('slow', function() {
	  resetResourcePreviewHeight(); 
	});
	if($('div#gooru-collection-player-narrative-menu-arrow').is(':visible')) {
	  $('div#gooru-collection-player-narrative-menu-arrow').hide();
	  $('div#gooru-collection-player-base-container').data('selected-menu', 'narrative');
	} else {
	  $('div#gooru-collection-player-narrative-menu-arrow').css('display', 'block');
	  $('div#gooru-collection-player-base-container').data('selected-menu', 'narrative');
	}
    });
    $('span.gooru-collection-resource-play-next-arrow-span').click(function() { 
	var currentIndex = $('div.collection-player-resource-content-val-selected').index('div.collection-player-resource-content-val');
	if($('div.collection-player-resource-content-val:eq('+ (currentIndex + 1)+')').length > 0) { 
	  $('div.collection-player-resource-content-val:eq('+ (currentIndex + 1)+')').trigger('click');
	  resetResourcePreviewHeight();
	} else { 
	  $('div.gooru-collection-player-resource-summary-div').trigger('click');
	}
    });
    $('span.gooru-collection-resource-play-prev-arrow-span').click(function() { 
	var currentIndex = $('div.collection-player-resource-content-val-selected').index('div.collection-player-resource-content-val');
	if($('div.collection-player-resource-content-val:eq('+ (currentIndex - 1)+')').length > 0) { 
	  $('div.collection-player-resource-content-val:eq('+ (currentIndex - 1)+')').trigger('click');
	  resetResourcePreviewHeight(); 
	} else { 
	  $('div.gooru-collection-player-resource-home-div').trigger('click');
	}
    });    
    $('div.gooru-collection-player-resource-home-div').click(function() { 
      var currentPlayingElementId = (typeof $('div.currentCollectionResourcePlayed').attr('id') != 'undefined') ? $("div#"+$('div.currentCollectionResourcePlayed').attr('id')).data("resource-position") : "";
      $('div#gooru-collection-player-cover-page-container').show();
      $('div#gooru-collection-resource-play-content').empty();
      $('div#gooru-collection-player-resource-play-container').hide();
      collectionPlay.sendCollectionResourceStopEvent(helper.getEventDataObject(),currentPlayingElementId,helper.getTimeInMilliSecond());
      collectionPlay.sendCollectionStopEvent();
    });
    $('div.gooru-collection-player-resource-summary-div').click(function() { 
      var currentPlayingElementId = (typeof $('div.currentCollectionResourcePlayed').attr('id') != 'undefined') ? $("div#"+$('div.currentCollectionResourcePlayed').attr('id')).data("resource-position") : "";
      $('div#gooru-collection-resource-play-content').empty();
      $('div#gooru-collection-player-resource-play-container').hide();
      $('div#gooru-collection-player-resource-summary-container').show();
      collectionPlay.sendCollectionResourceStopEvent(helper.getEventDataObject(),currentPlayingElementId,helper.getTimeInMilliSecond());
      collectionPlay.sendCollectionStopEvent();
    });
  },
  collectionPlayDialogBox: function(element, width,  modal, heigth) { 
    $(element).dialog({
      autoOpen: false,
      width: width,
      resizable: false,
      modal: modal,
      height: heigth
    });
    $('.ui-dialog-titlebar').remove();
    
  },
  collectionPlayResourceAcknowledgment: function(collectionId) { 
    var url = GOORU_REST_ENDPOINT + '/collection/' + collectionId + '/resourceSource/list.json';
    $.ajax({
      type : 'GET',
      url : url,
      dataType : 'jsonp',
      success : function(data) {
	  var acknowledgmentHTML = new EJS({url : '/templates/collection/collectionPlayerAcknowledgement.template'}).render({data : collectionPlay.groupResourceAcknowledgment(data)});
	  $('div#collection-ack-dialog-container').html(acknowledgmentHTML);
	  helper.onErrorDefaultImage();
	  $('div.gooru-collection-player-ack-button-okay').click(function() { 
		$('#collection-ack-dialog-container').dialog('close');
	  });
	  $('div.gooru-collection-player-acknowledgement-list-content').each(function() {
	     var totalResource = $(this).find('div.collection-play-ack-resource').length;
	     var width = (totalResource * 90);
	     var sequence = $(this).data('sequence');
	     $(this).find('div.collection-player-acknowledgement-list-inner-content').css('width', width);
	     if (totalResource > 5) {
	      $('span.gooru-collection-player-next-arrow-' + sequence).css('display', 'block');
	     }
	  });
	  $('span.gooru-collection-player-next-arrow').click(function() { 
	      var sequence = $(this).data('sequence');
	      var marginLeftCurrentVal = Number($('div.collection-player-acknowledgement-list-inner-content-' + sequence).css('margin-left').replace('px', ''));
	      var actualWidth = $('div.gooru-collection-player-acknowledgement-list-content').width();
	      var marginLeft = ((actualWidth) + marginLeftCurrentVal);
	      var totalWidth = $('div.collection-player-acknowledgement-list-inner-content-' + sequence).width();
	      if (totalWidth > marginLeft) {
		var newMarginWidth = marginLeft + actualWidth;
		if (newMarginWidth >= totalWidth) { 
		  $('span.gooru-collection-player-next-arrow-' + sequence).hide();
		}
		$('div.collection-player-acknowledgement-list-inner-content-' + sequence).animate({marginLeft : '-' + marginLeft + 'px' }, 800, function() {
			    });
		$('span.gooru-collection-player-prev-arrow-' + sequence).css('display', 'block');
	      }
	  });
	  $('span.gooru-collection-player-prev-arrow').click(function() { 
	      var sequence = $(this).data('sequence');
	      var marginLeftCurrentVal = Number($('div.collection-player-acknowledgement-list-inner-content-' + sequence).css('margin-left').replace('px', ''));
	      var actualWidth = $('div.gooru-collection-player-acknowledgement-list-content').width();
	      var marginLeft = ((actualWidth) + marginLeftCurrentVal);
	      if (marginLeft == 0) {
		$('span.gooru-collection-player-prev-arrow-' + sequence).hide();
	      }
	      if (marginLeft >= 0) {
		$('div.collection-player-acknowledgement-list-inner-content-' + sequence).animate({marginLeft : '-' + marginLeft + 'px' }, 800, function() {
			    });
		$('span.gooru-collection-player-next-arrow-' + sequence).css('display', 'block');
	      } 
	  });
      }
    });
  },
  
  groupResourceAcknowledgment: function(data) { 
      var resourceSourceGroup = [];
      var resourceSourceGroupMultipleSource =[] ;
      var  resourceData = data.resources;
      for (var resourceIndex = 0; resourceIndex < resourceData.length ; resourceIndex++ ) {
	if (resourceData[resourceIndex].resource.resourceSource != null && resourceData[resourceIndex].resource.resourceSource.attribution != null && resourceData[resourceIndex].resource.resourceSource.attribution != '') {
	  if (typeof(resourceSourceGroup[resourceData[resourceIndex].resource.resourceSource.attribution]) == 'undefined') {
	    if (resourceData[resourceIndex].resource.resourceSource.attribution != 'Multiple Sources') {
		resourceSourceGroup[resourceData[resourceIndex].resource.resourceSource.attribution] = [];
	    }
	  }
	  if (resourceData[resourceIndex].resource.resourceSource.attribution == 'Multiple Sources') {
	    resourceSourceGroupMultipleSource.push(resourceData[resourceIndex]) ; 
	    continue;
	  }
	  resourceSourceGroup[resourceData[resourceIndex].resource.resourceSource.attribution].push(resourceData[resourceIndex]);
	}
      }
      if (resourceSourceGroupMultipleSource.length > 0 ) { 
	resourceSourceGroup['Multiple Sources'] = [];
	resourceSourceGroup['Multiple Sources'] = resourceSourceGroupMultipleSource;
      }
      return resourceSourceGroup;
  },
  
  showCollectionPlayResourcePreview: function(data) {
    var resourcePlayHeader = new EJS({url : '/templates/collection/resourcePlayHeader.template'}).render({data: data});
    $('div#gooru-collection-player-resource-play-container').html(resourcePlayHeader);
    helper.onErrorDefaultImage();
    var numberOfResourceDisplay = Math.floor($('div#collection-segment-base-container').width() / ($('div.collection-segment-content:eq(0)').width()));
    var resetWidth = ($('div#collection-segment-base-container').width() / numberOfResourceDisplay);
    $('div.collection-segment-content').css('width', resetWidth);
    var totalWidth = ($('div.collection-segment-content').length * resetWidth) + 2;
    $('div#collection-segment-container').css('width', totalWidth);
    if ($('div.collection-segment-content').length > numberOfResourceDisplay) { 
	$('span.gooru-collection-player-resource-next-arrow').css('display', 'block');
    }
    $('span.gooru-collection-player-resource-next-arrow').click(function() { 
	var marginLeftCurrentVal = Math.abs(Number($('div#collection-segment-container').css('margin-left').replace('px', '')));
	var actualWidth = $('div#collection-segment-base-container').width();
	var marginLeft = ((actualWidth) + marginLeftCurrentVal);
	var totalWidth = $('div#collection-segment-container').width();
	if (totalWidth > marginLeft) {
	  var newMarginWidth = marginLeft + actualWidth;
	  if (newMarginWidth >= totalWidth) { 
	    $('span.gooru-collection-player-resource-next-arrow').hide();
	  }
	  $('div#collection-segment-container').animate({marginLeft : '-' + marginLeft + 'px' }, 800, function() {
		      });
	  $('span.gooru-collection-player-resource-prev-arrow').css('display', 'block');
	}
      });
      $('span.gooru-collection-player-resource-prev-arrow').click(function(e) { 
	  var marginLeftCurrentVal = Number($('div#collection-segment-container').css('margin-left').replace('px', ''));
	  var actualWidth = $('div#collection-segment-base-container').width();
	  var marginLeft = ((actualWidth) + marginLeftCurrentVal);
	  if (marginLeft == 0) {
	    $('span.gooru-collection-player-resource-prev-arrow').hide();
	  }
	  if (marginLeft <= 0) {
	    $('div#collection-segment-container').animate({marginLeft :  marginLeft + 'px' }, 800, function() {
			});
	    $('span.gooru-collection-player-resource-next-arrow').css('display', 'block');
	  } 
      });
      $('div.collection-player-resource-content-val').click(function(e) {
	 $('div.collection-player-resource-content-val').removeClass('currentCollectionResourcePlayed');
	 $('div.collection-player-resource-content-val').removeClass('lastCollectionResourcePlayed');
	 $('div.collection-player-resource-content-val-selected').addClass('lastCollectionResourcePlayed');
          collectionPlay.resourcePlayerActivityStop();
	  $('div.collection-player-resource-content-val').removeClass('collection-player-resource-content-val-selected');
	  $(this).addClass('collection-player-resource-content-val-selected');
	  $(this).addClass('currentCollectionResourcePlayed');
	  var previewValues =  JSON.parse(unescape($(this).data('resource-json')));
	  var segmentIndex = $(this).data('segment-index');
	  previewValues.segmentTitle =  unescape($('div.collection-segment-resource-container-' + segmentIndex).data('segment-title'));
	  previewValues.segmentIndex = segmentIndex;
	  collectionPlay.resourcePreview(previewValues);
	  collectionPlay.showResourceNarrative(previewValues);
	  collectionPlay.showResourceInfo(previewValues); 
      });
  },
  resourcePlayerActivityStop: function() { 
	var activityLogId = $('div#gooru-collection-player-base-container').data('activity-log-id');
  	var gooruOid = $('div#gooru-collection-player-base-container').data('gooru-oid');
  	activityLog.triggerActivityLog(activityLogId, 'stop', gooruOid, 'collection-resource-player', null, window.location , 'collection-resource-player-stop');  
  }, 
  resourceDataFormatter: function (data) {
        var startTime = "0";
        var thumnailUrl = "";
        var options = '';
        var stopTime = "0";
        var resourceUrl = typeof (data.resource.url) != 'undefined' ? data.resource.url : '';
        var type = data.resource.resourceType.name;
        var startPPT = (data.start != null && data.start != '') ? data.start : 1;
        var stopPPT  =  (data.stop != null && data.stop != '') ? data.stop : '';
        var filePath = data.resource.assetURI + data.resource.folder;
        var title = (data.title == null) ? data.resource.title : data.title;
        var description = (data.description == null) ? data.resource.description : data.description;
        var resourceSource = typeof (data.resource.resourceSource) != 'undefined' ? data.resource.resourceSource : null;
        var documentId = (data.documentid == null) ? '' : data.documentid;
        var documentkey = (data.documentkey == null) ? '' : data.documentkey;
        var narrative = (typeof (data.narration) != 'undefined' && data.narration != null) ? data.narration : '';
        var brokenStatus = data.resource.hasFrameBreaker != null && data.resource.hasFrameBreaker ? 1 : 0;
        var resourcestatus = {statusIsFrameBreaker: brokenStatus};
        var gooruOid = data.resource.gooruOid;
	var standards = typeof(data.standards) != 'undefined' ? data.standards : [];

        if (typeof (startPPT) === 'string') {
            startTime = helper.calculateTime(startPPT);
        } else if (typeof (startPPT) === 'number') {
        	startTime = (data.start != null && data.start != '') ? data.start : 0;  
        }
        if (typeof (stopPPT) === 'string') {
            stopTime = helper.calculateTime(stopPPT);
        } else if (typeof (stopPPT) === 'number') {
            stopTime = stopPPT;
        }
        var collectionOwnerId = $('div#gooru-collection-player-base-container').data('collectionOwnerId');
        var previewValues = {
            resourceUrl: resourceUrl,
            type: type,
            startTime: startTime,
            startPPT: startPPT,
            stopPPT: stopPPT,
            filePath: filePath,
            title: title,
            description: description,
            resourceSource: resourceSource,
	    standards: standards,
            options: options,
            isWebResource: helper.isWebResource(resourceUrl, type),
            resourceExtenstion: helper.getResourceFileExtenstion(resourceUrl),
            stopTime: stopTime,
            documentId: documentId,
            documentKey: documentkey,
            narrative: narrative,
            resourceUserId: collectionOwnerId,
            resourcestatus: resourcestatus,
            thumbnail: data.resource.thumbnail,
	    questionType:null,
	    category: data.resource.category,
            gooruOid: gooruOid,
	    resourceInstanceId: data.resourceInstanceId,
	    resource: data.resource,
	    collectionOwnerName: $('div#gooru-collection-player-base-container').data('collectionOwnerName'),
	    TOKEN : USER.sessionToken,
	    collectionitemSequence:data.itemSequence
        };
	if (type == 'assessment-question') {
	  previewValues.questionType = data.questionInfo.type;
	  previewValues.answers = data.questionInfo.answers;
	  previewValues.questionExplanation = data.questionInfo.explanation;
	  previewValues.questionHints = data.questionInfo.hints;
	  previewValues.questionImageURL = (typeof data.questionInfo.thumbnails.url != 'undefined') ? data.questionInfo.thumbnails.url : "";
	}
        return previewValues;
    },
    resourcePreview: function (previewValues) {
      var useScribd = false;
	if (previewValues.documentId != '' && previewValues.documentKey != '') {
	useScribd = true;
	}
	previewValues.useScribd = useScribd;
	var resourcePreviewHtml = new EJS({
	    url: '/templates/collection/collectionResourcePreview.template'
	}).render(previewValues);
	with(previewValues) {
	  $('div#gooru-collection-player-header-resource-title').html(title);
	  if(segmentTitle != null && typeof(segmentTitle) != 'undefined' &&  segmentTitle.length > 0) {
	    $('div.gooru-collection-player-header-segment-content').show();
	  } else { 
	    $('div.gooru-collection-player-header-segment-content').hide();
	  }
	  $('span#gooru-collection-player-header-segment-title').html(segmentTitle);
	  $('span#collection-header-chapter-Index').html((segmentIndex + 1));
	  $('div#gooru-collection-player-overlay-icon-header').removeClass();
	  $('div#gooru-collection-player-overlay-icon-header').addClass('gooru-collection-player-overlay-icon');
	  $('div#gooru-collection-player-overlay-icon-header').addClass('gooru-collection-player-overlay-icon-' + category.toLowerCase());
	  var signedBaseUrl = GOORU_REST_ENDPOINT + '/signed/resource/url/'+gooruOid;
	  $('div#gooru-collection-resource-play-content').html(resourcePreviewHtml);
	  
	  switch (type) {
	    case 'video/youtube':
	      var videoId = helper.getYoutubeVideoId(resourceUrl);
	      resourcePlayers.youtubeVideo(videoId, startTime, 'resourcePlayYoutubeplayer-' + gooruOid);
	    break;
	    case 'animation/kmz':
	      mtours.init((signedBaseUrl + '?file=' + resourceUrl), 'collectionResourcePreviewGoogleEarthContainer');
	    break;
	    case 'animation/swf':
	      var fileExtension = resourceUrl.split('.').pop();
	      if (fileExtension == 'flv') {
		resourcePlayers.flvPlayer('../swf/flowplayer-3.2.11.swf', 'collectionResourcePreviewFlashContainer');
	      }
	      else {
		resourcePlayers.animation((signedBaseUrl + '?file='+ resourceUrl+'&sessionToken='+USER.sessionToken),  'collectionResourcePreviewFlashContainer');
	      }
	    break;
	    case 'textbook/scribd':
	      if(useScribd){
		resourcePlayers.pdfReader(documentId, documentKey, startPPT, 'collectionResourcePreviewTextbookScribd');
	      }
	    break;
	    case 'assessment-question': 
	      resourcePlayers.questionResource(previewValues,'div#collectionQuestionPreviewContentContainer');
	    break;
	  }
 	  var activityLogId = generateGUID();
	  
 	  $('div#gooru-collection-player-base-container').data('activity-log-id', activityLogId);
 	  $('div#gooru-collection-player-base-container').data('gooru-oid',  gooruOid);
 	  activityLog.triggerActivityLog(activityLogId, 'start', gooruOid, 'collection-resource-play', null, window.location , 'collection-resource-play-Start');
	  collectionPlay.sendCollectionDataForEventLogging(previewValues);
      }
    },
    
    sendCollectionDataForEventLogging: function(previewValues){
      var eventLoggingData = helper.getEventDataObject();
      with(previewValues){
	  var playTime = helper.getTimeInMilliSecond();
	  $('div#collection-player-resource-content-val-'+previewValues.collectionitemSequence).attr('data-gooru-oid', gooruOid);
	  var previousPlayedElementId = (typeof $('div.lastCollectionResourcePlayed').attr('id') != 'undefined') ? $("div#"+$('div.lastCollectionResourcePlayed').attr('id')).data('resource-position') : "" ;
	  var currentPlayingElementId = (typeof $('div.currentCollectionResourcePlayed').attr('id') != 'undefined') ? $("div#"+$('div.currentCollectionResourcePlayed').attr('id')).data("resource-position") : "";
	  var questionResourceType = (questionType != null) ? helper.getQuestionResourceType(questionType) : "RES";
	  $('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-type',questionResourceType );
	  $('div#collection-player-resource-content-val-'+currentPlayingElementId).removeData('question-explanation-time question-answer-time question-attempt-status question-attempt-try-sequence play-start-time question-hints-used user-text question-answer-object');
	  $('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-play-start-time', playTime);
	  if(type == 'assessment-question'){ 
	    eventLoggingData.resourceType = "question"; 
	    var attemptStatus = [];
	    var attemptTrySequence = [];
	    var attemptCount = 0;
	    var answerTimestamp = "";
	    var answerObject = "";
	    $('input.gooru-answer-container').click(function(){
	      var attemptQuestionType = helper.getQuestionResourceType($(this).data('question-type'));
	      var answerSubmitTime = helper.getTimeInMilliSecond();
	      if(attemptQuestionType == 'TF' || attemptQuestionType == 'MC'){
		attemptCount++;
		attemptStatus[attemptCount] = helper.isAttemptAnswerCorrect();
		attemptTrySequence[attemptCount] = $('input[name="gooru-mcq"]:checked').data('answer-sequence');
		answerObject += '"attempt'+attemptCount+'":[{"text":"'+helper.encodeTextForQuestionResource( $("div.multiple-choice-answer-text-"+$('input[name="gooru-mcq"]:checked').data('answer-sequence'))[0].innerHTML)+'","status":"'+helper.isAttemptAnswerCorrect()+'","order":"'+$('input[name="gooru-mcq"]:checked').data("answer-sequence")+'","skip":false,"answerId":'+$('input[name="gooru-mcq"]:checked').data('answer-id')+',"timeStamp":'+answerSubmitTime+'}],';
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-attempt-try-sequence',attemptTrySequence);
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-attempt-status',attemptStatus);
		answerTimestamp += "\""+ $('input[name="gooru-mcq"]:checked').data('answer-id') + "\":" +answerSubmitTime+",";
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-answer-time',answerTimestamp);
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-answer-object',answerObject);
	      }
	      if(attemptQuestionType == 'FIB'){
		var fillInBlankElement = $('input.fib-answer');
		var answerStatus = 1;
		var fibUserAnswers = ""
		for(var blanks = 0 ; fillInBlankElement.length > blanks ; blanks++ ){
		  attemptCount++;
		  if($(fillInBlankElement[blanks]).css('background-color') == 'rgb(254, 232, 199)'){
		    answerStatus = 0;
		  }
		  attemptTrySequence[attemptCount] = attemptCount;
		  fibUserAnswers += "[" + $(fillInBlankElement[blanks]).val() + "],";
		  answerTimestamp += "\"" + $(fillInBlankElement[blanks]).data('answer-fib-id') + "\":" + answerSubmitTime + ",";
		  var isSkipped = ($(fillInBlankElement[blanks]).val().trim().length > 0) ? false : true;
		  answerObject += '{"text":"'+helper.encodeTextForQuestionResource($(fillInBlankElement[blanks]).val())+'","status":"'+answerStatus+'","order":"'+attemptCount+'","skip":'+isSkipped+',"answerId":'+$(fillInBlankElement[blanks]).data('answer-fib-id')+',"timeStamp":'+answerSubmitTime+'},';
		}
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-user-text',helper.encodeTextForQuestionResource(fibUserAnswers));
		attemptStatus[1] = answerStatus;
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-attempt-status',attemptStatus);
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-attempt-try-sequence',attemptTrySequence);
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-answer-time',answerTimestamp);
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-answer-object','"attempt1":['+answerObject.substring(0,answerObject.length-1)+'],');
	      }
	      if(attemptQuestionType == 'OE'){
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-user-text',helper.encodeTextForQuestionResource($("textarea#gooru-oe-answer-submit").val())+",");
		attemptStatus[1] = null;
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-attempt-status',attemptStatus);
		answerObject = '"attempt1":[{"text":"'+helper.encodeTextForQuestionResource($("textarea#gooru-oe-answer-submit").val())+'","status":"1","order":"","skip":false,"answerId":'+0+',"timeStamp":'+answerSubmitTime+'}],';
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-answer-object',answerObject);
		helper.sendSaveEventForOEQuestionResource(gooruOid,helper.encodeTextForQuestionResource($("textarea#gooru-oe-answer-submit").val()),",",answerObject,"collection",answerSubmitTime,$('div.collection-player-resource-content-val').data("session-id"));
	      }
	      if(attemptQuestionType == 'MA'){
		var maAnswerOptions =  $("input.gooru-ma-radio-button");
		attemptCount++;
		var maAnswerObject = "";
		var attemptSequenceText = "";
		var sequence = 0;
		attemptStatus[attemptCount] = helper.isAttemptAnswerCorrect();
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-attempt-status',attemptStatus);
		attemptTrySequence[attemptCount] = 1;
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-attempt-try-sequence',attemptTrySequence);
		for (var options = 0 ; maAnswerOptions.length > options ; options++) { 
		  if($(maAnswerOptions[options]).is(':checked')) {
		    sequence++;
		    attemptSequenceText += "["+ $(maAnswerOptions[options]).data("radio-position") + "],";
		    answerTimestamp += "\"" + $(maAnswerOptions[options]).attr('name') + "\":" + answerSubmitTime + ",";
		    var maStatus = ($(maAnswerOptions[options]).val() == $(maAnswerOptions[options]).data('mc-is-correct').toString()) ? 1 : 0;
		    maAnswerObject += '{"text":"'+$(maAnswerOptions[options]).data("radio-position")+'","status":"'+maStatus+'","order":"'+sequence+'","skip":false,"answerId":'+$(maAnswerOptions[options]).attr('name')+',"timeStamp":'+answerSubmitTime+'},';
		  }
		}
		answerObject += '\"attempt'+attemptCount+'\":['+maAnswerObject.substring(0,maAnswerObject.length-1)+'],';
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-user-text',attemptSequenceText);
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-answer-time',answerTimestamp);
		$('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-answer-object',answerObject);
	      }
	      var lastScore = (typeof attemptStatus[attemptStatus.length-1] != 'undefined' && attemptStatus[attemptStatus.length-1] != null) ? attemptStatus[attemptStatus.length-1] : 0;
	      $('div#collection-player-resource-content-val-'+currentPlayingElementId).removeAttr("data-last-score");
	      $('div#collection-player-resource-content-val-'+currentPlayingElementId).removeData("last-score");
	      $('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-last-score',lastScore);
	    });
	    $("input#gooru-question-explanation-button").click(function(){
	      $('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-explanation-time',helper.getTimeInMilliSecond());
	    });
	    var hintVisibleContainerId = 0;
	    var answerHintObject = "";
	    $("input#gooru-question-hint-button").click(function(){
	      answerHintObject += "\""+$("div.gooru-question-hint-container-"+hintVisibleContainerId).data('hint-id')+"\":"+helper.getTimeInMilliSecond()+",";
	      $('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-question-hints-used',answerHintObject);
	      hintVisibleContainerId++;
	    });   
	  } else {
	    eventLoggingData.resourceType = "resource";
	  }
	  $('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-resource-type', eventLoggingData.resourceType);
	  var initialEventId = generateGUID().toUpperCase();
	  eventLoggingData.eventId = initialEventId;
	  eventLoggingData.startTime = playTime;
	  eventLoggingData.stopTime = playTime;
	  if(typeof $('div.collection-player-resource-content-val').data("session-id") == 'undefined' || $('div.collection-player-resource-content-val').data("session-id").length == 0) {
	    var sessionIdForCollection = helper.getSessionIdForEvent($('div#gooru-collection-player-base-container').data('collectionId'),USER.sessionToken);
	    var collectionSessionId = (typeof sessionIdForCollection != 'undefined' && sessionIdForCollection.length > 0) ? sessionIdForCollection : generateGUID();
	    $('div.collection-player-resource-content-val').attr("data-session-id",collectionSessionId.toUpperCase());
	  }
	  eventLoggingData.sessionId = $('div.collection-player-resource-content-val').data("session-id");
	  if (typeof $('div.lastCollectionResourcePlayed').attr('id') == 'undefined' || $('div.collection-player-resource-content-val').hasClass("collection-init")){
	    $('div.collection-player-resource-content-val').removeData("collection-start-time");
	    $('div.collection-player-resource-content-val').removeAttr("data-collection-start-time");
	    eventLoggingData.eventName = 'collection.play';
	    eventLoggingData.contentGooruId = $('div#gooru-collection-player-base-container').data('collectionId');
	    eventLoggingData.activityType = "start";
	    eventLoggingData.resourceType = "";
	    $('div.collection-player-resource-content-val').attr("data-parent-event-id",initialEventId);
	    $('div.collection-player-resource-content-val').attr("data-collection-start-time",playTime);
	    eventLoggingData.parentEventId = "";
	    $('div.collection-player-resource-content-val').removeClass("collection-init");
	    eventLoggingData.path = $('div#gooru-collection-player-base-container').data('collectionId');
	    activityLog.generateEventLogData(eventLoggingData);
	  } else {
	    collectionPlay.sendCollectionResourceStopEvent(eventLoggingData,previousPlayedElementId,playTime);
	  }
	  var startEventId = generateGUID().toUpperCase();
	  $('div#collection-player-resource-content-val-'+currentPlayingElementId).attr('data-event-id', startEventId);
	  eventLoggingData.eventId = startEventId;
	  eventLoggingData.contentGooruId = $("div#collection-player-resource-content-val-"+currentPlayingElementId).data("gooru-oid");
	  eventLoggingData.path = $('div#gooru-collection-player-base-container').data('collectionId') + "/" + $("div#collection-player-resource-content-val-"+currentPlayingElementId).data("gooru-oid");
	  eventLoggingData.activityType = "start";
	  eventLoggingData.eventName = 'collection.resource.play';
	  eventLoggingData.parentGooruId = $('div#gooru-collection-player-base-container').data('collectionId');
	  eventLoggingData.totalTimeSpent = 0;
	  eventLoggingData.startTime = playTime;
	  eventLoggingData.stopTime = playTime;
	  eventLoggingData.resourceType = $("div#collection-player-resource-content-val-"+currentPlayingElementId).data('resource-type');
	  eventLoggingData.parentEventId = $('div.collection-player-resource-content-val').data("parent-event-id");
	  eventLoggingData.questionType = questionResourceType;
	  eventLoggingData.questionAttemptData = undefined;
	  eventLoggingData.questionExplanationTimestamp = undefined;
	  eventLoggingData.answerTimestamp = undefined;
	  eventLoggingData.questionAttemptSequence = undefined;
	  eventLoggingData.hintTimeStamp = undefined;
	  eventLoggingData.answerText = undefined;
	  eventLoggingData.answerObject = undefined;
	  activityLog.generateEventLogData(eventLoggingData);
	  $("div.collection-player-resource-content-val").removeAttr("data-question-answer-time data-question-attempt-try-sequence data-question-attempt-status data-question-explanation-time data-question-hints-used data-user-text data-question-answer-object");
      }
    },
    
    sendCollectionResourceStopEvent:function(eventLoggingData,previousPlayedElementId,playTime){
	  eventLoggingData.eventName = 'collection.resource.play';
	  eventLoggingData.activityType = "stop";
	  eventLoggingData.parentGooruId = $('div#gooru-collection-player-base-container').data('collectionId');
	  eventLoggingData.contentGooruId = $("div#collection-player-resource-content-val-"+previousPlayedElementId).data('gooru-oid');
	  eventLoggingData.totalTimeSpent = playTime - $("div#collection-player-resource-content-val-"+previousPlayedElementId).data('play-start-time')
	  eventLoggingData.resourceType = $("div#collection-player-resource-content-val-"+previousPlayedElementId).data('resource-type');
	  eventLoggingData.parentEventId = $('div.collection-player-resource-content-val').data("parent-event-id");
	  eventLoggingData.questionType = $('div#collection-player-resource-content-val-'+previousPlayedElementId).data('question-type');
	  eventLoggingData.questionAttemptData = $('div#collection-player-resource-content-val-'+previousPlayedElementId).data('question-attempt-status');
	  eventLoggingData.questionAttemptSequence = $('div#collection-player-resource-content-val-'+previousPlayedElementId).data('question-attempt-try-sequence');
	  eventLoggingData.questionExplanationTimestamp = $('div#collection-player-resource-content-val-'+previousPlayedElementId).attr('data-question-explanation-time');
	  eventLoggingData.answerTimestamp = $('div#collection-player-resource-content-val-'+previousPlayedElementId).attr('data-question-answer-time');
	  eventLoggingData.startTime = (typeof $('div#collection-player-resource-content-val-'+previousPlayedElementId).attr('data-play-start-time') != 'undefined') ? Number($('div#collection-player-resource-content-val-'+previousPlayedElementId).attr('data-play-start-time')) : playTime;
	  eventLoggingData.stopTime = playTime;
	  eventLoggingData.hintTimeStamp = $('div#collection-player-resource-content-val-'+previousPlayedElementId).attr('data-question-hints-used');
	  eventLoggingData.answerText = $('div#collection-player-resource-content-val-'+previousPlayedElementId).attr('data-user-text');
	  eventLoggingData.answerObject = $('div#collection-player-resource-content-val-'+previousPlayedElementId).attr('data-question-answer-object');
	  eventLoggingData.eventId = $('div#collection-player-resource-content-val-'+previousPlayedElementId).attr('data-event-id');
	  eventLoggingData.sessionId = $('div.collection-player-resource-content-val').data("session-id");
	  eventLoggingData.path = $('div#gooru-collection-player-base-container').data('collectionId') + "/" + $("div#collection-player-resource-content-val-"+previousPlayedElementId).data('gooru-oid');
	  activityLog.generateEventLogData(eventLoggingData);
    },
    
    showResourceNarrative: function(previewValues) { 
        if(typeof(previewValues.narrative) != 'undefined'  && previewValues.narrative != null && previewValues.narrative.length > 0) {
	  var resourceNarrativeHtml = new EJS({
	      url: '/templates/collection/resourceNarrative.template'
	  }).render(previewValues);
	  $('div#gooru-collection-player-resource-play-menu-narrative-container').html(resourceNarrativeHtml);
	  var menuType = $('div#gooru-collection-player-base-container').data('selected-menu');
	  $('div#gooru-collection-player-narrative-container-disabled').hide();
	  $('div#gooru-collection-player-narrative-container').show();
	  if( menuType === 'narrative' && !$('div#gooru-collection-player-narrative-container').is(':visible')) {
	    $('div#gooru-collection-player-narrative-container').trigger('click');
	  }
	} else { 
	  $('div#gooru-collection-player-narrative-container, div#gooru-collection-player-narrative-menu-arrow').hide();
	  $('div#gooru-collection-player-narrative-container-disabled').show();
	  $('div#gooru-collection-player-resource-play-menu-narrative-container').empty().hide();
	  $('div.gooru-collection-player-narrative-menu-icon').removeClass('gooru-collection-player-narrative-menu-icon-selected');
	  resetResourcePreviewHeight();
	}
    }, 
    showResourceInfo: function(previewValues) { 
	var resourceAboutHtml = new EJS({
	    url: '/templates/collection/resourceAbout.template'
	}).render(previewValues);
	$('div#gooru-collection-player-resource-play-menu-info-container').html(resourceAboutHtml);
	helper.roundedCornerForIE();
	helper.previewToolTip('.resourceBottomPreviewTooltip', 'bottom');
	helper.previewToolTip('.resourcePreviewTooltipLicense', 'bottom');
	helper.previewToolTip('.resourceBottomPreviewTooltipOER', 'bottom');
	var views = $('div#gooru-collection-resource-player-social-views').data('views') + 1;
	var gooruOid = $('div#gooru-collection-resource-player-social-views').data('gooruoid');
	$('div#gooru-collection-resource-player-social-views').data('views', views);
	var suffix = (views > 1) ? 's' : '';
	$('div#gooru-collection-resource-player-social-views').text(views + ' view' + suffix);
	helper.updateResourceViews(gooruOid, views);
	var menuType = $('div#gooru-collection-player-base-container').data('selected-menu');
	$('div#gooru-collection-player-info-container').show();
	if( menuType === 'info' && !$('div#gooru-collection-player-info-container').is(':visible')) {
	  $('div#gooru-collection-player-info-container').trigger('click');
	}
	if(previewValues.standards.length > 3 ) { 
		helper.previewToolTip('.standardExtraCount', 'bottom');
	}
    },

    collectionSummaryPage: function(data) { 
       var collectionSummaryContentHtml = new EJS({url : '/templates/collection/collectionSummaryPage.template'}).render({data: data});
       $('div#gooru-collection-player-resource-summary-container').html(collectionSummaryContentHtml);
       helper.onErrorDefaultImage();
       $('#collection-summrary-page-retake-content').click(function()  { 
 	$('div#gooru-collection-player-resource-summary-container').hide();
 	$('div#gooru-collection-player-cover-page-container').show();
       });
       $('div.collection-player-summary-resource-container').mouseenter(function() { 
 	$(this).find('span.collection-summary-page-goto-resource-span').show();
       });
       $('div.collection-player-summary-resource-container').mouseleave(function() { 
 	$(this).find('span.collection-summary-page-goto-resource-span').hide();
       });
       $('span.collection-summary-page-goto-resource-span').click(function() { 
 	$('div#gooru-collection-player-resource-summary-container').hide();
 	$('div#gooru-collection-player-resource-play-container').show();
 	var resourceinstanceid = $(this).data('resourceinstanceid');
 	$('div#collection-player-resource-' + resourceinstanceid).find('div.collection-player-resource-content-val').trigger('click');
       });
    },
    sendCollectionStopEvent:function(){
      var eventLoggingData = helper.getEventDataObject();
      var collectionStopTime = helper.getTimeInMilliSecond();
      eventLoggingData.eventId = $('div.collection-player-resource-content-val').data("parent-event-id");
      eventLoggingData.eventName = 'collection.play';
      eventLoggingData.contentGooruId = $('div#gooru-collection-player-base-container').data('collectionId');
      eventLoggingData.activityType = "stop";
      eventLoggingData.resourceType = "";
      eventLoggingData.startTime = $('div.collection-player-resource-content-val').data("collection-start-time");
      eventLoggingData.parentEventId = "";
      eventLoggingData.stopTime = collectionStopTime;
      eventLoggingData.totalTimeSpent = collectionStopTime - eventLoggingData.startTime;
      eventLoggingData.sessionId = $('div.collection-player-resource-content-val').data("session-id");
      eventLoggingData.path = $('div#gooru-collection-player-base-container').data('collectionId');
      $('div.collection-player-resource-content-val').removeAttr("data-session-id data-parent-event-id");
      $('div.collection-player-resource-content-val').removeData("session-id parent-event-id");
      activityLog.generateEventLogData(eventLoggingData);
      $('div.collection-player-resource-content-val').removeAttr("data-last-score");
      $('div.collection-player-resource-content-val').removeData("last-score");
    }
};
function resetResourcePreviewHeight() {
    var height = $(window).height();
    if($('div.collection-resource-play-menu-container').is(':visible')) { 
      $('.gooru-collection-player-preview-container').css('height', (height - 155));
    } else { 
      $('.gooru-collection-player-preview-container').css('height', (height - 62));
    }
}
function onYouTubePlayerReady(playerid) {
  var myPlayer = document.getElementById(playerid);
  var resourceI//nstanceId = playerid.split('youtubeMovie-resourcePlayYoutubeplayer-')[1];
  var stopTime = $('div#resourcePlayYoutubeplayer-' + resourceInstanceId).data('videostop');
  var fromPreRender = $('div#resourcePlayYoutubeplayer-' + resourceInstanceId).data('fromprerender');
    if(myPlayer != null) {
      var originalStoptime = myPlayer.getDuration();
      if (Number(stopTime) >= Number(originalStoptime)  || Number(stopTime) <= 0) {
        stopTime = originalStoptime - 1;
      }
      resourcePlayers.playVideo(myPlayer, stopTime);
      myPlayer.addEventListener('onStateChange', 'onYouTubeStateChange');
    }
}

function onYouTubeStateChange(playerStatusId) {
  if(playerStatusId === 2 || playerStatusId === 0) {
        collectionPlay.resourcePlayerActivityStop();
  }
  if (playerStatusId != 2) {
    var playerid = $('div.currentlyPlayingYoutubeVideoResource').data('playerid');
    if (typeof(playerid) != 'undefined') {
      var stopTime = $('div.currentlyPlayingYoutubeVideoResource').data('videostop');
      var myPlayer = document.getElementById('youtubeMovie-resourcePlayYoutubeplayer-' + playerid);
      resourcePlayers.triggerStopVideo(myPlayer, stopTime);
    }
  }
}

$(document).ready(function () {
 helper.userSignin({onComplete:collectionPlay.init});
 //collectionPlay.init();
});
