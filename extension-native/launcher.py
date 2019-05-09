#!/usr/bin/env python

import os
import sys
import json
import struct
import subprocess

def getMessage():
  rawLength = sys.stdin.read(4)
  if len(rawLength) == 0:
    sys.exit(0)
  messageLength = struct.unpack('@I', rawLength)[0]
  message = sys.stdin.read(messageLength)
  return json.loads(message)

def sendMessage(messageContent):
  encodedContent = json.dumps(messageContent)
  encodedLength = struct.pack('@I', len(encodedContent))

  sys.stdout.write(encodedLength)
  sys.stdout.write(encodedContent)
  sys.stdout.flush()

def escapeSpace(val):
  val = unicode(val)
  val = val.replace(u' ', u'\\ ')
  return val

launchInfo = getMessage()
path = escapeSpace(launchInfo['path'])
url = "'"+launchInfo['url']+"'"
command = path+" "+url
subprocess.Popen(command, shell=True)
