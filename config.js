// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

window.addEventListener('load', function() {
  options.userid.value = localStorage.userid;

  options.userid.onchange = function() { localStorage.userid = options.userid.value; chrome.extension.sendRequest({task: "setNotifications"}); };
});
