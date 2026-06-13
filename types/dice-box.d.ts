declare module '@3d-dice/dice-box' {
  export interface DiceBoxDie {
    groupId: number
    rollId: number
    sides: number
    value: number
    theme?: string
  }
  export interface DiceBoxGroup {
    groupId: number
    rollId: number
    sides: number
    qty: number
    modifier: number
    value: number
    rolls: DiceBoxDie[]
  }
  export interface DiceBoxConfig {
    container?: string
    assetPath: string
    scale?: number
    theme?: string
    themeColor?: string
    enableShadows?: boolean
    offscreen?: boolean
    throwForce?: number
    onRollComplete?: (results: DiceBoxGroup[]) => void
  }
  export default class DiceBox {
    constructor(config: DiceBoxConfig)
    init(): Promise<void>
    roll(
      notation: string | object | Array<string | object>,
      options?: object,
    ): Promise<DiceBoxGroup[]>
    add(notation: string | object): Promise<DiceBoxGroup[]>
    clear(): void
    updateConfig(config: Partial<DiceBoxConfig>): void
    onRollComplete?: (results: DiceBoxGroup[]) => void
  }
}
