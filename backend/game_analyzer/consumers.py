import json
import random
import chess
from django.utils import timezone
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import LiveGame


class GameConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for a live chess game."""

    async def connect(self):
        # Get the game ID from the URL
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.room_group_name = f'game_{self.game_id}'

        # Join the game's WebSocket group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )
        await self.accept()

        # Send current game state to the connecting player
        game_state = await self.get_game_state()
        await self.send(text_data=json.dumps({
            'type': 'game_state',
            **game_state,
        }))

    async def disconnect(self, close_code):
        # Leave the game's WebSocket group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

    async def receive(self, text_data):
        """Handle incoming messages from a player."""
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'move':
            await self.handle_move(data)
        elif message_type == 'join':
            await self.handle_join(data)
        elif message_type == 'resign':
            await self.handle_resign(data)
        elif message_type == 'clock_flag':
            await self.handle_clock_flag(data)

    async def handle_move(self, data):
        """Validate and broadcast a move."""
        move_uci = data.get('move')  # e.g. "e2e4"
        user = self.scope['user']

        # Validate the move server-side with python-chess
        result = await self.make_move(move_uci, user)

        if result.get('timeout'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'game_over',
                    'status': 'timeout',
                    'result': result['result'],
                    'message': result['message'],
                }
            )
        elif result['valid']:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'game_move',
                    'move': move_uci,
                    'fen': result['fen'],
                    'status': result['status'],
                    'result': result.get('result', ''),
                    'white_time': result['white_time'],
                    'black_time': result['black_time'],
                    'server_time': timezone.now().isoformat(),
                }
            )

    async def handle_join(self, data):
        """Handle a player joining the game. Colors are randomly assigned."""
        user = self.scope['user']
        result = await self.join_game(user)

        if result:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'player_joined',
                    'white': result['white'],
                    'black': result['black'],
                    'white_time': result['white_time'],
                    'black_time': result['black_time'],
                    'server_time': timezone.now().isoformat(),
                }
            )

    async def handle_resign(self, data):
        """Handle a player resigning."""
        user = self.scope['user']
        result = await self.resign_game(user)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_over',
                'status': 'resigned',
                'result': result,
                'message': f'{user.username} resigned.',
            }
        )

    async def handle_clock_flag(self, data):
        """Handle a player claiming their opponent's time ran out."""
        result = await self.check_timeout()
        if result:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'game_over',
                    'status': 'timeout',
                    'result': result['result'],
                    'message': result['message'],
                }
            )

    # ── Broadcast handlers ──────────────────────────────────
    # These are called by group_send and forward to all clients

    async def game_move(self, event):
        await self.send(text_data=json.dumps(event))

    async def player_joined(self, event):
        await self.send(text_data=json.dumps(event))

    async def game_over(self, event):
        await self.send(text_data=json.dumps(event))

    # ── Database operations ─────────────────────────────────

    @database_sync_to_async
    def get_game_state(self):
        game = LiveGame.objects.get(id=self.game_id)
        return {
            'fen': game.fen,
            'moves': game.moves,
            'status': game.status,
            'result': game.result,
            'white': game.white_player.username,
            'black': game.black_player.username if game.black_player else None,
            'time_control': game.time_control,
            'time_mode': game.time_mode,
            'white_time': game.white_time_remaining,
            'black_time': game.black_time_remaining,
            'server_time': timezone.now().isoformat(),
        }

    @database_sync_to_async
    def make_move(self, move_uci, user):
        game = LiveGame.objects.get(id=self.game_id)

        if game.status != 'active':
            return {'valid': False}

        board = chess.Board(game.fen)

        # Verify it's this player's turn
        if board.turn == chess.WHITE and game.white_player != user:
            return {'valid': False}
        if board.turn == chess.BLACK and game.black_player != user:
            return {'valid': False}

        # Deduct time from the player who is moving
        now = timezone.now()
        if game.last_move_timestamp:
            elapsed = (now - game.last_move_timestamp).total_seconds()
            if board.turn == chess.WHITE:
                game.white_time_remaining -= elapsed
                if game.white_time_remaining <= 0:
                    game.white_time_remaining = 0
                    game.status = 'timeout'
                    game.result = '0-1'
                    game.save()
                    return {'valid': False, 'timeout': True, 'result': '0-1',
                            'message': f'{game.white_player.username} ran out of time.'}
            else:
                game.black_time_remaining -= elapsed
                if game.black_time_remaining <= 0:
                    game.black_time_remaining = 0
                    game.status = 'timeout'
                    game.result = '1-0'
                    game.save()
                    return {'valid': False, 'timeout': True, 'result': '1-0',
                            'message': f'{game.black_player.username} ran out of time.'}

        # For daily games, reset the moving player's clock after each move
        if game.time_mode == 'per_move':
            if board.turn == chess.WHITE:
                game.white_time_remaining = game.time_control
            else:
                game.black_time_remaining = game.time_control

        game.last_move_timestamp = now

        # Validate the move
        try:
            move = chess.Move.from_uci(move_uci)
            if move not in board.legal_moves:
                return {'valid': False}
        except ValueError:
            return {'valid': False}

        # Apply the move
        board.push(move)

        # Update the game
        game.moves.append(move_uci)
        game.fen = board.fen()

        # Check for game end
        result = {}
        if board.is_checkmate():
            game.status = 'checkmate'
            game.result = '1-0' if board.turn == chess.BLACK else '0-1'
            result['result'] = game.result
        elif board.is_stalemate():
            game.status = 'stalemate'
            game.result = '1/2-1/2'
            result['result'] = game.result
        elif board.is_insufficient_material():
            game.status = 'draw'
            game.result = '1/2-1/2'
            result['result'] = game.result

        game.save()
        return {
            'valid': True, 'fen': game.fen, 'status': game.status,
            'white_time': game.white_time_remaining,
            'black_time': game.black_time_remaining,
            **result,
        }

    @database_sync_to_async
    def join_game(self, user):
        game = LiveGame.objects.get(id=self.game_id)
        if game.black_player is not None:
            return None  # Game is full
        if game.white_player == user:
            return None  # Can't play yourself
        # Randomly assign colors
        if random.choice([True, False]):
            # Swap — joiner gets white, creator gets black
            game.black_player = game.white_player
            game.white_player = user
        else:
            # No swap — joiner gets black
            game.black_player = user
        game.status = 'active'
        game.white_time_remaining = game.time_control
        game.black_time_remaining = game.time_control
        game.last_move_timestamp = timezone.now()
        game.save()
        return {
            'white': game.white_player.username,
            'black': game.black_player.username,
            'white_time': game.white_time_remaining,
            'black_time': game.black_time_remaining,
        }

    @database_sync_to_async
    def resign_game(self, user):
        game = LiveGame.objects.get(id=self.game_id)
        game.status = 'resigned'
        if game.white_player == user:
            game.result = '0-1'
        else:
            game.result = '1-0'
        game.save()
        return game.result

    @database_sync_to_async
    def check_timeout(self):
        game = LiveGame.objects.get(id=self.game_id)
        if game.status != 'active' or not game.last_move_timestamp:
            return None

        elapsed = (timezone.now() - game.last_move_timestamp).total_seconds()
        board = chess.Board(game.fen)

        if board.turn == chess.WHITE:
            remaining = game.white_time_remaining - elapsed
            if remaining <= 0:
                game.white_time_remaining = 0
                game.status = 'timeout'
                game.result = '0-1'
                game.save()
                return {'result': '0-1', 'message': f'{game.white_player.username} ran out of time.'}
        else:
            remaining = game.black_time_remaining - elapsed
            if remaining <= 0:
                game.black_time_remaining = 0
                game.status = 'timeout'
                game.result = '1-0'
                game.save()
                return {'result': '1-0', 'message': f'{game.black_player.username} ran out of time.'}

        return None