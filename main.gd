extends Control

@onready var floor_label: Label = $MainWorkspace/SplitLayout/DungeonViewportPanel/DungeonFloorIndicator
@onready var console_output: RichTextLabel = $MainWorkspace/SplitLayout/DungeonViewportPanel/BattleArenaDisplay/LogConsole
@onready var coin_label: Label = $MainWorkspace/SplitLayout/GuildPanel/GuildLayout/CoinDisplay
@onready var hire_warrior_btn: Button = $MainWorkspace/SplitLayout/GuildPanel/GuildLayout/RosterGrid/WarriorCard/HireWarriorBtn
@onready var hire_mage_btn: Button = $MainWorkspace/SplitLayout/GuildPanel/GuildLayout/RosterGrid/MageCard/HireMageBtn
@onready var buy_weapon_drills_btn: Button = $MainWorkspace/SplitLayout/GuildPanel/GuildLayout/UpgradesGrid/WeaponDrillsCard/BuyWeaponDrillsBtn
@onready var buy_roster_expansion_btn: Button = $MainWorkspace/SplitLayout/GuildPanel/GuildLayout/UpgradesGrid/RosterExpansionCard/BuyRosterExpansionBtn

@onready var dungeon_engine: Node = $DungeonEngine

func _ready() -> void:
	if GameState.adventurers.size() == 0:
		GameState.adventurers.append({
			"classType": "Warrior",
			"level": 1,
			"currentHP": 120,
			"maxHP": 120,
			"atk": 12,
			"def": 8
		})

	dungeon_engine.log_message.connect(_on_dungeon_log_emitted)
	dungeon_engine.floor_cleared.connect(_on_floor_cleared)
	dungeon_engine.start_dungeon_run()
	_update_ui_displays()

func _process(_delta: float) -> void:
	coin_label.text = "Gold: %d" % GameState.coins
	_update_button_states()
	_update_upgrade_button_states()

func _on_dungeon_log_emitted(text: String) -> void:
	console_output.append_text(text + "\n")
	var scrollbar = console_output.get_v_scroll_bar()
	if scrollbar:
		scrollbar.value = scrollbar.max_value

func _on_floor_cleared(_level: int) -> void:
	_update_ui_displays()

func _update_ui_displays() -> void:
	floor_label.text = "Dungeon Floor: %d" % GameState.current_selected_level

func _update_button_states() -> void:
	var has_mage = false
	for hero in GameState.adventurers:
		if hero["classType"] == "Mage":
			has_mage = true
			break

	if has_mage:
		hire_mage_btn.text = "HIRED"
		hire_mage_btn.disabled = true
	elif GameState.coins < GameState.CLASS_RECRUITMENT_COSTS["Mage"]:
		hire_mage_btn.text = "75k Gold Required"
		hire_mage_btn.disabled = true
	elif GameState.adventurers.size() >= GameState.max_party_slots:
		hire_mage_btn.text = "PARTY FULL"
		hire_mage_btn.disabled = true
	else:
		hire_mage_btn.text = "HIRE MAGE"
		hire_mage_btn.disabled = false

func _update_upgrade_button_states() -> void:
	var drills_lvl = GameState.upgrades["weapon_drills"]
	var drills_cost = floori(100 * pow(1.16, drills_lvl))
	buy_weapon_drills_btn.text = "Weapon Drills (Lv.%d) - %dg" % [drills_lvl, drills_cost]
	buy_weapon_drills_btn.disabled = (GameState.coins < drills_cost)

	var roster_lvl = GameState.upgrades["party_expansion"]
	if roster_lvl >= 3:
		buy_roster_expansion_btn.text = "Guild Roster MAXED (Lv.3)"
		buy_roster_expansion_btn.disabled = true
	else:
		var roster_cost = floori(500 * pow(12.0, roster_lvl))
		buy_roster_expansion_btn.text = "Expand Roster (Lv.%d) - %dg" % [roster_lvl, roster_cost]
		buy_roster_expansion_btn.disabled = (GameState.coins < roster_cost)

func _on_hire_warrior_btn_pressed() -> void:
	pass

func _on_hire_mage_btn_pressed() -> void:
	var cost = GameState.CLASS_RECRUITMENT_COSTS["Mage"]
	if GameState.coins >= cost and GameState.adventurers.size() < GameState.max_party_slots:
		GameState.coins -= cost
		GameState.adventurers.append({
			"classType": "Mage",
			"level": 1,
			"currentHP": 60,
			"maxHP": 60,
			"atk": 22,
			"def": 2
		})
		console_output.append_text("[SYSTEM]: Mage successfully joined the guild roster!\n")

func _on_buy_weapon_drills_btn_pressed() -> void:
	var drills_lvl = GameState.upgrades["weapon_drills"]
	var drills_cost = floori(100 * pow(1.16, drills_lvl))
	if GameState.coins >= drills_cost:
		GameState.coins -= drills_cost
		GameState.upgrades["weapon_drills"] = drills_lvl + 1
		console_output.append_text("[UPGRADE]: Weapon Drills upgraded! Party members get +5 flat ATK.\n")

func _on_buy_roster_expansion_btn_pressed() -> void:
	var roster_lvl = GameState.upgrades["party_expansion"]
	if roster_lvl < 3:
		var roster_cost = floori(500 * pow(12.0, roster_lvl))
		if GameState.coins >= roster_cost:
			GameState.coins -= roster_cost
			GameState.upgrades["party_expansion"] = roster_lvl + 1
			GameState.max_party_slots = 1 + GameState.upgrades["party_expansion"]
			console_output.append_text("[UPGRADE]: Guild Roster Expanded! Maximum party capacity increased to %d.\n" % GameState.max_party_slots)
