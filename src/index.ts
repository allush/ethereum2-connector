import { AbstractConnectorArguments, ConnectorUpdate } from '@web3-react/types'
import { AbstractConnector } from '@web3-react/abstract-connector'
import warning from 'tiny-warning'

import { SendReturnResult, SendReturn, Send, SendOld } from './types'

function parseSendReturn(sendReturn: SendReturnResult | SendReturn): any {
  return sendReturn.hasOwnProperty('result') ? sendReturn.result : sendReturn
}

export class NoEthereumProviderError extends Error {
  public constructor() {
    super()
    this.name = this.constructor.name
    this.message = 'No Ethereum provider was found on window.OneKey.'
  }
}

export class UserRejectedRequestError extends Error {
  public constructor() {
    super()
    this.name = this.constructor.name
    this.message = 'The user rejected the request.'
  }
}

export class OneKeyConnector extends AbstractConnector {
  constructor(kwargs: AbstractConnectorArguments) {
    super(kwargs)

    this.handleNetworkChanged = this.handleNetworkChanged.bind(this)
    this.handleChainChanged = this.handleChainChanged.bind(this)
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this)
    this.handleClose = this.handleClose.bind(this)
  }

  private handleChainChanged(chainId: string | number): void {
    if (__DEV__) {
      console.log("Handling 'chainChanged' event with payload", chainId)
    }
    this.emitUpdate({ chainId, provider: window.OneKey })
  }

  private handleAccountsChanged(accounts: string[]): void {
    if (__DEV__) {
      console.log("Handling 'accountsChanged' event with payload", accounts)
    }
    if (accounts.length === 0) {
      this.emitDeactivate()
    } else {
      this.emitUpdate({ account: accounts[0] })
    }
  }

  private handleClose(code: number, reason: string): void {
    if (__DEV__) {
      console.log("Handling 'close' event with payload", code, reason)
    }
    this.emitDeactivate()
  }

  private handleNetworkChanged(networkId: string | number): void {
    if (__DEV__) {
      console.log("Handling 'networkChanged' event with payload", networkId)
    }
    this.emitUpdate({ chainId: networkId, provider: window.OneKey })
  }

  public async activate(): Promise<ConnectorUpdate> {
    if (!window.OneKey) {
      throw new NoEthereumProviderError()
    }

    if (window.OneKey.on) {
      window.OneKey.on('chainChanged', this.handleChainChanged)
      window.OneKey.on('accountsChanged', this.handleAccountsChanged)
      window.OneKey.on('close', this.handleClose)
      window.OneKey.on('networkChanged', this.handleNetworkChanged)
    }

    if ((window.OneKey as any).isMetaMask) {
      ;(window.OneKey as any).autoRefreshOnNetworkChange = false
    }

    // try to activate + get account via eth_requestAccounts
    let account
    try {
      account = await (window.OneKey.send as Send)('eth_requestAccounts').then(
        sendReturn => parseSendReturn(sendReturn)[0]
      )
    } catch (error) {
      if ((error as any).code === 4001) {
        throw new UserRejectedRequestError()
      }
      warning(false, 'eth_requestAccounts was unsuccessful, falling back to enable')
    }

    // if unsuccessful, try enable
    if (!account) {
      // if enable is successful but doesn't return accounts, fall back to getAccount (not happy i have to do this...)
      account = await window.OneKey.enable().then(sendReturn => sendReturn && parseSendReturn(sendReturn)[0])
    }

    return { provider: window.OneKey, ...(account ? { account } : {}) }
  }

  public async getProvider(): Promise<any> {
    return window.OneKey
  }

  public async getChainId(): Promise<number | string> {
    if (!window.OneKey) {
      throw new NoEthereumProviderError()
    }

    let chainId
    try {
      chainId = await (window.OneKey.send as Send)('eth_chainId').then(parseSendReturn)
    } catch {
      warning(false, 'eth_chainId was unsuccessful, falling back to net_version')
    }

    if (!chainId) {
      try {
        chainId = await (window.OneKey.send as Send)('net_version').then(parseSendReturn)
      } catch {
        warning(false, 'net_version was unsuccessful, falling back to net version v2')
      }
    }

    if (!chainId) {
      try {
        chainId = parseSendReturn((window.OneKey.send as SendOld)({ method: 'net_version' }))
      } catch {
        warning(false, 'net_version v2 was unsuccessful, falling back to manual matches and static properties')
      }
    }

    if (!chainId) {
      if ((window.OneKey as any).isDapper) {
        chainId = parseSendReturn((window.OneKey as any).cachedResults.net_version)
      } else {
        chainId =
          (window.OneKey as any).chainId ||
          (window.OneKey as any).netVersion ||
          (window.OneKey as any).networkVersion ||
          (window.OneKey as any)._chainId
      }
    }

    return chainId
  }

  public async getAccount(): Promise<null | string> {
    if (!window.OneKey) {
      throw new NoEthereumProviderError()
    }

    let account
    try {
      account = await (window.OneKey.send as Send)('eth_accounts').then(
        sendReturn => parseSendReturn(sendReturn)[0]
      )
    } catch {
      warning(false, 'eth_accounts was unsuccessful, falling back to enable')
    }

    if (!account) {
      try {
        account = await window.OneKey.enable().then(sendReturn => parseSendReturn(sendReturn)[0])
      } catch {
        warning(false, 'enable was unsuccessful, falling back to eth_accounts v2')
      }
    }

    if (!account) {
      account = parseSendReturn((window.OneKey.send as SendOld)({ method: 'eth_accounts' }))[0]
    }

    return account
  }

  public deactivate() {
    if (window.OneKey && window.OneKey.removeListener) {
      window.OneKey.removeListener('chainChanged', this.handleChainChanged)
      window.OneKey.removeListener('accountsChanged', this.handleAccountsChanged)
      window.OneKey.removeListener('close', this.handleClose)
      window.OneKey.removeListener('networkChanged', this.handleNetworkChanged)
    }
  }

  public async isAuthorized(): Promise<boolean> {
    if (!window.OneKey) {
      return false
    }

    try {
      return await (window.OneKey.send as Send)('eth_accounts').then(sendReturn => {
        if (parseSendReturn(sendReturn).length > 0) {
          return true
        } else {
          return false
        }
      })
    } catch {
      return false
    }
  }
}
