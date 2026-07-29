'use client'

import { useState } from 'react'
import { FiCheck, FiCopy } from 'react-icons/fi'

export function SSHCopyButton() {
  const [copied, setCopied] = useState(false)

  function copySSH() {
    navigator.clipboard.writeText('ssh seanyang.me')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="ssh-hint">
      prefer a terminal?
      <button className="ssh-copy" onClick={copySSH}>
        <code>$ ssh seanyang.me</code>
        <span className="ssh-copy-label">
          {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
        </span>
      </button>
    </div>
  )
}
