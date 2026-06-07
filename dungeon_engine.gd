extends Node

signal log_message(text: String)
signal combat_updated(monster_hp: int, monster_max_hp: int)
signal floor_cleared(floor_level: int)

var current_monster: Dictionary = {}
var current_monster_hp: int = 0
var is_in_combat: bool = false
var battle_tick_timer: float = 0.0
var tick_rate: float = 0.4

@onready var map_generator = load("res://map_generator.gd").new()

func _process(delta: float) -> void:
	if not is_in_combat:
		return

	battle_tick_timer += delta
	if battle_tick_timer >= tick_rate:
		battle_tick_timer = 0.0
		execute_combat_tick()

func start_dungeon_run() -> void:
	var floor_level = GameState.current_selected_level
	var active_party_size = max(1, GameState.adventurers.size())

	current_monster = map_generator.generate_monster_stats(floor_level, false, active_party_size)
	current_monster_hp = current_monster["hp"]
	is_in_combat = true
	battle_tick_timer = 0.0

	log_message.emit("Party enters Floor %d. An enemy appears with %d HP!" % [floor_level, current_monster_hp])
	combat_updated.emit(current_monster_hp, current_monster["hp"])

func execute_combat_tick() -> void:
	if GameState.adventurers.size() == 0:
		resolve_party_wipe()
		return

	var total_party_damage: int = 0
	for hero in GameState.adventurers:
		if hero.get("currentHP", 0) > 0:
			var base_atk = hero.get("atk", 10) + (GameState.upgrades.get("weapon_drills", 0) * 5)
			var dmg = max(1, base_atk - current_monster["def"])
			total_party_damage += dmg

	current_monster_hp = max(0, current_monster_hp - total_party_damage)
	combat_updated.emit(current_monster_hp, current_monster["hp"])

	if current_monster_hp <= 0:
		resolve_monster_death()
		return

	for hero in GameState.adventurers:
		if hero["currentHP"] > 0:
			var dmg_taken = max(1, current_monster["atk"] - (hero.get("def", 0) + (GameState.upgrades.get("plate_forging", 0) * 2)))
			hero["currentHP"] = max(0, hero["currentHP"] - dmg_taken)
			log_message.emit("Enemy hits %s for %d damage!" % [hero["classType"], dmg_taken])
			break

	var party_alive: bool = false
	for hero in GameState.adventurers:
		if hero["currentHP"] > 0:
			party_alive = true
			break

	if not party_alive:
		resolve_party_wipe()

func resolve_monster_death() -> void:
	is_in_combat = false
	var gold_earned = map_generator.get_gold_revenue_per_run(GameState.current_selected_level)
	GameState.coins += gold_earned

	log_message.emit("Enemy defeated! Earned %d gold." % gold_earned)
	floor_cleared.emit(GameState.current_selected_level)

	if GameState.current_selected_level == GameState.max_cleared_level + 1:
		GameState.max_cleared_level = GameState.current_selected_level

	GameState.current_selected_level += 1
	start_dungeon_run()

func resolve_party_wipe() -> void:
	is_in_combat = false
	log_message.emit("Party wiped out! Retreating to town to recover...")

	for hero in GameState.adventurers:
		hero["currentHP"] = hero.get("maxHP", 100)
