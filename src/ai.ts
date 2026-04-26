import * as THREE from "three";
import { performAttack, type CombatHooks } from "./combat";
import { startAttackAnim } from "./animation";
import type { Entity } from "./types";

export function tickEnemyAI(
  enemy: Entity,
  player: Entity,
  dt: number,
  hooks: CombatHooks,
): void {
  if (!enemy.alive || !enemy.ai) return;
  const ai = enemy.ai;

  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);

  const distToPlayer = enemy.position.distanceTo(player.position);
  const distToSpawn = enemy.position.distanceTo(ai.spawn);

  if (distToSpawn > ai.leashRange) {
    enemy.attackTarget = null;
    enemy.moveTarget = ai.spawn.clone();
    if (enemy.stats.hp < enemy.stats.hpMax) {
      enemy.stats.hp = Math.min(
        enemy.stats.hpMax,
        enemy.stats.hp + enemy.stats.hpMax * dt * 0.5,
      );
    }
  } else if (player.alive && distToPlayer < ai.aggroRange) {
    enemy.attackTarget = player;
    if (distToPlayer > enemy.stats.attackRange * 0.9) {
      enemy.moveTarget = player.position.clone();
    } else {
      enemy.moveTarget = null;
      if (enemy.attackCooldown <= 0) {
        startAttackAnim(enemy);
        performAttack(enemy, player, hooks);
        enemy.attackCooldown = enemy.stats.attackSpeed;
      }
    }
  } else {
    enemy.attackTarget = null;
    const now = performance.now() / 1000;
    if (!enemy.moveTarget && now > ai.nextPatrolAt) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * ai.patrolRadius;
      enemy.moveTarget = ai.spawn
        .clone()
        .add(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
      ai.nextPatrolAt = now + 2 + Math.random() * 4;
    }
  }
}
